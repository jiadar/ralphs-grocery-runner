import csv
import json
import os
from datetime import datetime
import requests

# ----------------------------
# Config
# ----------------------------
BASE_URL = os.environ["OP_BASE_URL"].rstrip("/")
API_KEY  = os.environ["OP_API_KEY"]
PROJECT  = "business-admin"

INPUT_CSV  = os.environ["OP_IMPORT_CSV"]
OUTPUT_CSV = "results.csv"

# ----------------------------
# HTTP session
# ----------------------------
session = requests.Session()
session.auth = ("apikey", API_KEY)
session.headers.update({"Content-Type": "application/json"})

# ----------------------------
# Helpers
# ----------------------------
def iso_date_or_none(value: str):
    """Return YYYY-MM-DD or None; raises on invalid formats."""
    if value is None:
        return None
    s = str(value).strip()
    if not s:
        return None
    datetime.strptime(s, "%Y-%m-%d")  # validate format
    return s

def summarize_error(resp: requests.Response) -> str:
    """Extract a useful message from OpenProject API errors."""
    try:
        data = resp.json()
        if isinstance(data, dict) and data.get("message"):
            return f"{resp.status_code}: {data['message']}"
        return f"{resp.status_code}: {str(data)[:250]}"
    except Exception:
        return f"{resp.status_code}: {resp.text[:250]}"

# ----------------------------
# 1) Find Task type href for this project
# ----------------------------
r = session.get(f"{BASE_URL}/api/v3/projects/{PROJECT}/types")
r.raise_for_status()
types = r.json()["_embedded"]["elements"]
task_type = next(t for t in types if t["name"].strip().lower() == "task")
TYPE_HREF = task_type["_links"]["self"]["href"]

# ----------------------------
# 2) Load priorities once and map by name -> href
# ----------------------------
prio_resp = session.get(
    f"{BASE_URL}/api/v3/priorities",
    params={"pageSize": 1000, "offset": 1},
)
prio_resp.raise_for_status()
prio_elements = prio_resp.json().get("_embedded", {}).get("elements", [])

priority_href_by_name = {}
for p in prio_elements:
    name = (p.get("name") or "").strip()
    href = p.get("_links", {}).get("self", {}).get("href")
    if name and href:
        priority_href_by_name[name.lower()] = href

def priority_href_for_name(name: str):
    if not name:
        return None
    key = str(name).strip().lower()
    if not key:
        return None
    return priority_href_by_name.get(key)

# ----------------------------
# 3) Resolve users by username (login) using assignee_name from CSV (lowercased)
# ----------------------------
user_href_cache = {}

def user_href_for_username(username: str):
    """
    Returns "/api/v3/users/{id}" href or None if not found/visible.
    Uses assignee_name (lowercase) to match OpenProject username/login.
    """
    if not username:
        return None

    uname = str(username).strip().lower()
    if not uname:
        return None

    if uname in user_href_cache:
        return user_href_cache[uname]

    href = None

    # Prefer login filter (exact match)
    filters = [{"login": {"operator": "=", "values": [uname]}}]
    resp = session.get(
        f"{BASE_URL}/api/v3/users",
        params={"filters": json.dumps(filters), "pageSize": 50, "offset": 1},
    )

    if resp.status_code < 300:
        elements = resp.json().get("_embedded", {}).get("elements", [])
        # Prefer exact login match if field is visible
        for u in elements:
            login = (u.get("login") or "").strip().lower()
            if login == uname:
                href = u.get("_links", {}).get("self", {}).get("href")
                break
        # Fallback: first hit
        if not href and elements:
            href = elements[0].get("_links", {}).get("self", {}).get("href")

    # Fallback if login filter yields nothing (or login not searchable in your setup):
    if not href:
        filters = [{"name": {"operator": "=", "values": [uname]}}]
        resp2 = session.get(
            f"{BASE_URL}/api/v3/users",
            params={"filters": json.dumps(filters), "pageSize": 50, "offset": 1},
        )
        if resp2.status_code < 300:
            elements = resp2.json().get("_embedded", {}).get("elements", [])
            if elements:
                href = elements[0].get("_links", {}).get("self", {}).get("href")

    user_href_cache[uname] = href
    return href

# ----------------------------
# 4) Create work packages + write results.csv
# ----------------------------
created = 0
failed = 0

with open(INPUT_CSV, newline="", encoding="utf-8") as fin, \
     open(OUTPUT_CSV, "w", newline="", encoding="utf-8") as fout:

    reader = csv.DictReader(fin)
    writer = csv.DictWriter(
        fout,
        fieldnames=["external_id", "subject", "created_work_package_id", "status/error"],
    )
    writer.writeheader()

    for row in reader:
        external_id = (row.get("external_id") or "").strip()
        subject     = (row.get("subject") or "").strip()

        # Dates
        try:
            start_date = iso_date_or_none(row.get("start_date"))
            due_date   = iso_date_or_none(row.get("due_date"))
        except Exception as e:
            failed += 1
            writer.writerow({
                "external_id": external_id,
                "subject": subject,
                "created_work_package_id": "",
                "status/error": f"INVALID DATE: {e}",
            })
            continue

        # Assignee by username (CSV assignee_name -> OpenProject login)
        assignee_username = (row.get("assignee_name") or "").strip().lower()
        assignee_href = user_href_for_username(assignee_username) if assignee_username else None

        # Priority by name (CSV priority must match OpenProject priority name)
        priority_name = (row.get("priority") or "").strip()
        priority_href = priority_href_for_name(priority_name) if priority_name else None

        if not subject:
            failed += 1
            writer.writerow({
                "external_id": external_id,
                "subject": subject,
                "created_work_package_id": "",
                "status/error": "SKIPPED: empty subject",
            })
            continue

        description = (row.get("description") or "").strip()

        payload = {
            "subject": subject,
            "description": {"format": "plain", "raw": description} if description else None,
            "_links": {
                "type": {"href": TYPE_HREF}
            }
        }
        if payload["description"] is None:
            del payload["description"]

        if start_date:
            payload["startDate"] = start_date
        if due_date:
            payload["dueDate"] = due_date

        warnings = []

        # Assignee
        if assignee_username and assignee_href:
            payload["_links"]["assignee"] = {"href": assignee_href}
        elif assignee_username and not assignee_href:
            warnings.append(f"assignee not found: {assignee_username}")

        # Priority
        if priority_name and priority_href:
            payload["_links"]["priority"] = {"href": priority_href}
        elif priority_name and not priority_href:
            warnings.append(f"priority not found: {priority_name}")

        resp = session.post(
            f"{BASE_URL}/api/v3/projects/{PROJECT}/work_packages",
            json=payload,
        )

        if resp.status_code >= 300:
            failed += 1
            writer.writerow({
                "external_id": external_id,
                "subject": subject,
                "created_work_package_id": "",
                "status/error": summarize_error(resp),
            })
        else:
            created += 1
            wp = resp.json()
            status_msg = "CREATED"
            if warnings:
                status_msg = "CREATED (" + "; ".join(warnings) + ")"

            writer.writerow({
                "external_id": external_id,
                "subject": subject,
                "created_work_package_id": wp.get("id", ""),
                "status/error": status_msg,
            })

print(f"Done. Created: {created}, Failed/Skipped: {failed}")
print(f"Wrote: {OUTPUT_CSV}")
