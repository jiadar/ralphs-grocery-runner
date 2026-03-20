# Marvin → OpenProject Import

Scripts and data for importing tasks exported from [Marvin](https://amazingmarvin.com/) into [OpenProject](https://www.openproject.org/) via the OpenProject API.

## Files

| File | Description |
|------|-------------|
| `Marvin_Tasks_OpenProject.csv` | Exported tasks formatted for OpenProject import |
| `import.py` | Import script that creates work packages via the OpenProject API |
| `import.sh` | Shell script that loads `.env` and runs the import |
| `.env.example` | Template for your local `.env` credentials file |

## Prerequisites

- Python 3.8+
- `requests` library (`pip install requests`)
- An OpenProject instance with API access
- An OpenProject API key (generated under *My Account → Access Tokens*)

## Setup

1. Clone this repo and navigate to the directory.
2. Install dependencies:
   ```bash
   pip install requests
   ```
3. Copy `.env.example` to `.env` and fill in your credentials:
   ```bash
   cp .env.example .env
   ```
   Then edit `.env`:
   ```
   OP_BASE_URL=https://your-openproject.example
   OP_API_KEY=YOUR_API_KEY
   ```

> `.env` is gitignored and will never be committed. `.env.example` is safe to commit as it contains no real credentials.

## Usage

```bash
chmod +x import.sh
./import.sh
```

The script will load your `.env`, create one work package per row in the CSV, and write a `results.csv` file with the outcome for each task.

## Configuration

At the top of `import.py`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PROJECT` | `business-admin` | OpenProject project identifier to import tasks into |
| `INPUT_CSV` | `Marvin_Tasks_OpenProject.csv` | Path to the input CSV |
| `OUTPUT_CSV` | `results.csv` | Path to write import results |

## CSV Format

The import CSV uses the following columns:

| Column | Description |
|--------|-------------|
| `external_id` | Sequential task ID (`marvin-1`, `marvin-2`, ...) |
| `subject` | Task title |
| `project` | OpenProject project identifier |
| `assignee_name` | OpenProject username (login) to assign the task to |
| `type` | Work package type (always `Task`) |
| `completed` | `t` or `f` |
| `status` | e.g. `Backlog`, `Open`, `Closed` |
| `start_date` | `YYYY-MM-DD` |
| `due_date` | `YYYY-MM-DD` |
| `description` | Task notes |

> **Note:** The `completed` column is not currently sent to the API; tasks are created with the status defined in the `status` column.

## Output

After running, a `results.csv` is generated with the following columns:

| Column | Description |
|--------|-------------|
| `external_id` | Task ID from the input CSV |
| `subject` | Task title |
| `created_work_package_id` | OpenProject work package ID (if created successfully) |
| `status/error` | `CREATED`, `CREATED (assignee not found: ...)`, or error details |

## Security

- **Never commit `.env`** — it contains your API key.
- `.env.example` is safe to commit; it holds only placeholder values.
- The API key grants access to your OpenProject instance — treat it like a password.

`.gitignore` should include:
```
.env
results.csv
```
