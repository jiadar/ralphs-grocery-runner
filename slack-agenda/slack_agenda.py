#!/usr/bin/env python3
"""
slack_agenda.py — Fetch Slack conversations for given people and generate a meeting agenda.

Usage:
    python slack_agenda.py alice@example.com bob@example.com
    python slack_agenda.py alice@example.com --days 14 --output my_agenda.md
    python slack_agenda.py alice@example.com bob@example.com --channels general,engineering
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime, timedelta, timezone
from collections import defaultdict

from dotenv import load_dotenv
from slack_sdk import WebClient
from slack_sdk.errors import SlackApiError
import anthropic

load_dotenv()

SLACK_TOKEN = os.environ.get("SLACK_USER_TOKEN")
ANTHROPIC_KEY = os.environ.get("ANTHROPIC_API_KEY")


# ---------------------------------------------------------------------------
# Slack helpers
# ---------------------------------------------------------------------------

def make_slack_client():
    if not SLACK_TOKEN:
        sys.exit("Error: SLACK_USER_TOKEN is not set. Copy .env.example to .env and fill it in.")
    return WebClient(token=SLACK_TOKEN)


def slack_call(fn, *args, **kwargs):
    """Call a Slack SDK method, retrying on rate-limit (HTTP 429) responses."""
    while True:
        try:
            return fn(*args, **kwargs)
        except SlackApiError as e:
            if e.response.status_code == 429:
                retry_after = int(e.response.headers.get("Retry-After", 5))
                print(f"  Rate limited — retrying in {retry_after}s …")
                time.sleep(retry_after)
            else:
                raise


def paginate(client_method, result_key, **kwargs):
    """Yield every item across all Slack cursor-paginated pages."""
    cursor = None
    while True:
        response = slack_call(client_method, **kwargs, cursor=cursor, limit=200)
        yield from response[result_key]
        cursor = response.get("response_metadata", {}).get("next_cursor")
        if not cursor:
            break


def fetch_all_workspace_users(client):
    """Return list of active, non-bot user dicts from the workspace."""
    users = []
    for u in paginate(client.users_list, "members"):
        if u.get("deleted") or u.get("is_bot") or u.get("id") == "USLACKBOT":
            continue
        users.append(u)
    return users


def _user_label(u):
    profile = u.get("profile", {})
    name = profile.get("real_name") or u.get("name") or u["id"]
    email = profile.get("email", "")
    return f"{name} ({email})" if email else name


def _fuzzy_match(local_part, all_users):
    """Return users whose name or email local-part contains local_part (case-insensitive)."""
    lp = local_part.lower()
    return [
        u for u in all_users
        if lp in (u.get("profile", {}).get("email", "") or "").lower()
        or lp in (u.get("profile", {}).get("real_name", "") or "").lower()
        or lp in (u.get("name", "") or "").lower()
    ]


def _prompt_confirm(prompt):
    reply = input(prompt).strip().lower()
    return reply in ("y", "yes", "")


def _prompt_select(all_users):
    """Print a numbered list and return the chosen user or None."""
    for i, u in enumerate(all_users, 1):
        print(f"  {i:3}.  {_user_label(u)}")
    raw = input("  Enter number (or 0 to abort): ").strip()
    if not raw.isdigit():
        return None
    idx = int(raw)
    if idx == 0 or idx > len(all_users):
        return None
    return all_users[idx - 1]


def resolve_emails(client, emails):
    """
    Resolve each email to a Slack user ID.
    Falls back to fuzzy match → manual confirmation → full list selection → abort.
    """
    result = {}
    all_users = None  # lazy-loaded only if needed

    for email in emails:
        # 1. Exact lookup via API
        try:
            resp = slack_call(client.users_lookupByEmail, email=email)
            uid = resp["user"]["id"]
            result[email] = uid
            print(f"  Resolved {email} → {uid} ({resp['user']['real_name']})")
            continue
        except SlackApiError:
            pass

        print(f"\n  Could not find exact match for: {email}")
        local_part = email.split("@")[0]

        # 2. Fuzzy match on local part
        if all_users is None:
            print("  Fetching workspace user list …")
            all_users = fetch_all_workspace_users(client)

        candidates = _fuzzy_match(local_part, all_users)

        if candidates:
            best = candidates[0]
            print(f"  Best guess: {_user_label(best)}")
            if _prompt_confirm("  Use this user? [Y/n]: "):
                result[email] = best["id"]
                print(f"  Confirmed → {best['id']}")
                continue

        # 3. Show full list and let user pick
        print(f"\n  Showing all {len(all_users)} workspace users — pick one for '{email}':")
        chosen = _prompt_select(all_users)
        if chosen:
            result[email] = chosen["id"]
            print(f"  Selected → {chosen['id']} ({_user_label(chosen)})")
            continue

        # 4. Abort for this email
        print(f"  Aborting: no user selected for {email}.")
        sys.exit(1)

    return result


def get_user_display_names(client, user_ids):
    """Return {user_id: display_name} for a set of user IDs."""
    names = {}
    for uid in user_ids:
        try:
            resp = slack_call(client.users_info, user=uid)
            profile = resp["user"]["profile"]
            names[uid] = profile.get("real_name") or profile.get("display_name") or uid
        except SlackApiError:
            names[uid] = uid
    return names


def fetch_channel_messages(client, channel_id, oldest_ts, target_user_ids=None):
    """
    Fetch messages from a channel after oldest_ts.
    If target_user_ids is given, only return messages sent by those users.
    Returns a list of message dicts with 'user', 'text', 'ts'.
    """
    messages = []
    try:
        for msg in paginate(client.conversations_history,
                            "messages",
                            channel=channel_id,
                            oldest=oldest_ts):
            if msg.get("subtype"):          # skip join/leave/bot noise
                continue
            if msg.get("bot_id"):           # skip bot messages
                continue
            user = msg.get("user")
            if not user:
                continue
            if target_user_ids and user not in target_user_ids:
                continue
            messages.append({
                "user": user,
                "text": msg.get("text", ""),
                "ts": msg["ts"],
            })
    except SlackApiError as e:
        # Common: channel_not_found, not_in_channel — silently skip
        if e.response["error"] not in ("channel_not_found", "not_in_channel", "missing_scope"):
            print(f"  Warning fetching channel {channel_id}: {e.response['error']}")
    return messages


def find_dm_channels(client, user_ids):
    """
    Return list of (channel_id, channel_type, member_ids) for every
    DM / group-DM that includes at least one of the target users.
    If user_ids is empty, return all DMs and group DMs.
    """
    found = []
    try:
        for conv in paginate(client.conversations_list,
                             "channels",
                             types="im,mpim"):
            cid = conv["id"]
            ctype = conv["is_im"] and "im" or "mpim"

            if conv.get("is_im"):
                other = conv.get("user")
                if not user_ids or other in user_ids:
                    found.append((cid, "im", {other}))
            else:
                try:
                    members = set(paginate(client.conversations_members, "members", channel=cid))
                    if not user_ids or members & user_ids:
                        found.append((cid, "mpim", members))
                except SlackApiError:
                    pass
    except SlackApiError as e:
        print(f"  Warning listing DM channels: {e.response['error']}")
    return found


def find_shared_channels(client, user_ids, channel_names=None):
    """
    Return list of (channel_id, channel_name) for channels where
    at least one target user has posted, optionally filtered by name.
    """
    found = []
    try:
        for conv in paginate(client.conversations_list,
                             "channels",
                             types="public_channel,private_channel"):
            name = conv.get("name", "")
            cid = conv["id"]
            if channel_names and name not in channel_names:
                continue
            found.append((cid, name))
    except SlackApiError as e:
        print(f"  Warning listing channels: {e.response['error']}")
    return found


# ---------------------------------------------------------------------------
# Message collection
# ---------------------------------------------------------------------------

def collect_all_messages(client, user_ids, oldest_ts, channel_names=None):
    """
    Returns a dict:
        {conversation_label: [{"user": uid, "text": ..., "ts": ...}, ...]}
    If user_ids is empty, fetches all accessible conversations without filtering by user.
    """
    conversations = defaultdict(list)
    filter_users = user_ids or None  # None disables per-message filtering

    # --- DMs and group DMs ---
    print("\nScanning DMs / group DMs …")
    dm_channels = find_dm_channels(client, user_ids)
    for cid, ctype, members in dm_channels:
        msgs = fetch_channel_messages(client, cid, oldest_ts)
        if msgs:
            label = f"{'DM' if ctype == 'im' else 'Group DM'} ({', '.join(members)})"
            conversations[label].extend(msgs)
            print(f"  {label}: {len(msgs)} messages")

    # --- Channels ---
    print("\nScanning channels …")
    channels = find_shared_channels(client, user_ids, channel_names)
    for cid, name in channels:
        msgs = fetch_channel_messages(client, cid, oldest_ts, target_user_ids=filter_users)
        if msgs:
            label = f"#{name}"
            conversations[label].extend(msgs)
            suffix = "from target users" if filter_users else "total"
            print(f"  #{name}: {len(msgs)} messages {suffix}")

    return dict(conversations)


# ---------------------------------------------------------------------------
# Agenda generation via Claude
# ---------------------------------------------------------------------------

def format_messages_for_prompt(conversations, display_names):
    """Convert conversation dict into readable text for the prompt."""
    parts = []
    for label, messages in conversations.items():
        parts.append(f"## Conversation: {label}\n")
        for msg in sorted(messages, key=lambda m: m["ts"]):
            ts = datetime.fromtimestamp(float(msg["ts"]), tz=timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            name = display_names.get(msg["user"], msg["user"])
            parts.append(f"[{ts}] {name}: {msg['text']}")
        parts.append("")
    return "\n".join(parts)


def generate_agenda(conversations, participant_emails, display_names, days):
    client = anthropic.Anthropic(api_key=ANTHROPIC_KEY)

    conversation_text = format_messages_for_prompt(conversations, display_names)
    participant_list = ", ".join(participant_emails)
    total_messages = sum(len(v) for v in conversations.values())

    if total_messages == 0:
        return "# Meeting Agenda\n\nNo relevant messages found in the specified time window.\n"

    prompt = f"""You are a chief of staff preparing a meeting agenda.

The following are Slack messages from the past {days} days involving: {participant_list}

{conversation_text}

---

Based on these conversations, produce a well-structured meeting agenda in Markdown.
Include:
1. **Meeting Purpose** — one sentence describing why these people should meet
2. **Participants** — list the people involved
3. **Agenda Items** — numbered list of topics to discuss, each with:
   - A clear title
   - 1-2 sentence context explaining what was discussed and why it needs attention
   - Any open questions or decisions needed
4. **Action Items** — bullet list of things that were mentioned but not yet resolved
5. **Background** — brief summary of the key themes across the conversations

Be concise and actionable. Do not reproduce raw message text — synthesize it."""

    print("\nGenerating agenda with Claude …")
    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Fetch Slack conversations and generate a meeting agenda."
    )
    parser.add_argument(
        "emails",
        nargs="*",
        help="Email addresses of the people to include. "
             "If omitted, all accessible conversations are fetched.",
    )
    parser.add_argument(
        "--days",
        type=int,
        default=7,
        help="How many days back to look (default: 7)",
    )
    parser.add_argument(
        "--channels",
        type=str,
        default=None,
        help="Comma-separated channel names to scan (e.g. general,engineering). "
             "If omitted, all channels are scanned.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Agenda output file path (default: agenda_YYYY-MM-DD.md)",
    )
    parser.add_argument(
        "--json-output",
        type=str,
        default=None,
        help="JSON messages output file path (default: messages_YYYY-MM-DD.json)",
    )
    return parser.parse_args()


def main():
    args = parse_args()

    emails = [e.strip().lower() for e in args.emails]
    channel_names = {c.strip() for c in args.channels.split(",")} if args.channels else None
    oldest_ts = str((datetime.now(tz=timezone.utc) - timedelta(days=args.days)).timestamp())
    datestamp = datetime.now().strftime('%Y-%m-%d_%H%M%S')
    output_path = args.output or f"agenda_{datestamp}.md"
    json_output_path = args.json_output or f"messages_{datestamp}.json"

    client = make_slack_client()

    # 1. Resolve emails → user IDs (skipped in all-conversations mode)
    if emails:
        print(f"\nResolving {len(emails)} email(s) …")
        email_to_id = resolve_emails(client, emails)
        if not email_to_id:
            sys.exit("No users could be resolved. Check your emails and token scopes.")
        user_ids = set(email_to_id.values())
    else:
        print("\nNo emails specified — fetching all accessible conversations.")
        email_to_id = {}
        user_ids = set()

    # 2. Get display names for target users
    display_names = get_user_display_names(client, user_ids)

    # 3. Collect messages
    conversations = collect_all_messages(client, user_ids, oldest_ts, channel_names)

    total = sum(len(v) for v in conversations.values())
    print(f"\nFound {total} total messages across {len(conversations)} conversation(s).")

    # Resolve display names for any users seen in messages
    seen_in_messages = {m["user"] for msgs in conversations.values() for m in msgs}
    new_ids = seen_in_messages - user_ids
    if new_ids:
        display_names.update(get_user_display_names(client, new_ids))

    # In all-mode, derive participant list from who actually spoke
    if not emails:
        emails = list({
            display_names.get(uid, uid)
            for uid in seen_in_messages
        })

    # 4. Write JSON messages
    json_payload = {
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
        "days": args.days,
        "participants": emails,
        "display_names": display_names,
        "conversations": {
            label: [
                {**msg, "display_name": display_names.get(msg["user"], msg["user"])}
                for msg in sorted(msgs, key=lambda m: m["ts"])
            ]
            for label, msgs in conversations.items()
        },
    }
    with open(json_output_path, "w") as f:
        json.dump(json_payload, f, indent=2)
    print(f"Messages written to: {json_output_path}")

    # 5. Generate agenda (skipped if no Anthropic key)
    if not ANTHROPIC_KEY:
        print("Skipping agenda generation (ANTHROPIC_API_KEY not set).")
    else:
        agenda_md = generate_agenda(conversations, emails, display_names, args.days)
        with open(output_path, "w") as f:
            f.write(agenda_md)
        print(f"Agenda written to:   {output_path}")


if __name__ == "__main__":
    main()
