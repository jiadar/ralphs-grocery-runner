# slack-agenda

Fetch Slack conversations involving specific people and generate a meeting agenda using Claude.

## Setup

**1. Install dependencies**
```bash
poetry install
```

**2. Configure credentials**
```bash
cp .env.example .env
# Fill in SLACK_USER_TOKEN and ANTHROPIC_API_KEY
```

**Slack token** (`xoxp-...`) requires these user token scopes:
`channels:history`, `channels:read`, `groups:history`, `groups:read`,
`im:history`, `im:read`, `mpim:history`, `mpim:read`,
`users:read`, `users:read.email`

## Usage

```bash
# Last 7 days (default)
poetry run slack-agenda alice@example.com bob@example.com

# Custom date range
poetry run slack-agenda alice@example.com --days 14

# Specific channels only
poetry run slack-agenda alice@example.com --channels general,engineering

# Custom output paths
poetry run slack-agenda alice@example.com --output my_agenda.md --json-output my_messages.json
```

## Output

| File | Description |
|---|---|
| `agenda_YYYY-MM-DD.md` | Claude-generated meeting agenda (skipped if no `ANTHROPIC_API_KEY`) |
| `messages_YYYY-MM-DD.json` | Raw messages from all conversations, sorted by timestamp |

### Agenda sections
1. **Meeting Purpose** — why these people should meet
2. **Participants** — who's involved
3. **Agenda Items** — topics with context and open questions
4. **Action Items** — unresolved items from conversations
5. **Background** — key themes summary
