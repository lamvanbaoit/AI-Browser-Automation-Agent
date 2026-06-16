# AI Browser Automation Agent

> AI-powered browser automation — describe a task in natural language, the agent opens a browser, navigates, and returns the result.

Built with **FastAPI** + **browser-use** + **MiniMax M2.5** (via VNG Cloud MaaS) + **React**.

---

## Quick Start

### 1. Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# Edit .env — set MINIMAX_API_KEY

python -m backend.main
# Server: http://localhost:8000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server: http://localhost:5173
```

> In production, the frontend is built (`npm run build`) and served as static files by FastAPI at `/`.

---

## Project Structure

```
automation-agent/
├── backend/
│   ├── main.py              # FastAPI app + uvicorn entry
│   ├── api/
│   │   ├── routes.py        # REST endpoints + QA proxy
│   │   └── websocket.py     # WebSocket realtime broadcast
│   └── core/
│       ├── agent.py         # BrowserAutomationAgent (browser-use)
│       └── config.py        # .env configuration
│
├── frontend/
│   └── src/
│       ├── App.jsx                     # Main app + task submission
│       ├── components/
│       │   ├── ChatBox.jsx             # Browser Agent chat UI
│       │   ├── QABox.jsx               # QA Requirements Analyzer
│       │   ├── SettingsPanel.jsx       # LLM + browser settings
│       │   ├── BrowserView.jsx
│       │   └── HistoryList.jsx
│       └── hooks/
│           └── useWebSocket.js         # WebSocket with auto-reconnect
│
├── .env.example             # Environment variable template
├── requirements.txt
└── Dockerfile
```

---

## How It Works

1. User types a task in the chat UI — e.g. `Go to github.com/trending → List top 5 repos`
2. Frontend `POST /api/v1/task` → backend returns `task_id` immediately
3. Backend spawns an async background task running `BrowserAutomationAgent`
4. Agent loop: LLM (MiniMax M2.5) reads the DOM → decides action → Playwright executes → repeat
5. After each step the backend broadcasts progress over WebSocket
6. Frontend shows live step updates; on completion displays the extracted result

---

## Agents

| Agent | Description |
|---|---|
| **Browser Agent** | Main agent — natural language → browser automation |
| **QA Agent** | Analyzes requirements text → test scenarios + test cases (EP/BVA/UC) |
| **Idempotency Agent** | API idempotency testing |

QA Agent and Idempotency Agent are external services integrated via sidebar links and the `/api/v1/qa/*` proxy endpoints.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/task` | Create automation task |
| `GET` | `/api/v1/task/{task_id}` | Get task status |
| `GET` | `/api/v1/tasks` | List all tasks |
| `DELETE` | `/api/v1/task/{task_id}` | Delete task |
| `POST` | `/api/v1/task/{task_id}/stop` | Stop running task |
| `POST` | `/api/v1/clear` | Clear all tasks |
| `POST` | `/api/v1/qa/analyze` | Analyze requirements → scenarios |
| `POST` | `/api/v1/qa/test-cases` | Scenarios → test cases |
| `WS` | `/ws` | Realtime task updates |

### Create Task — Request Body

```json
{
  "task": "Go to github.com/trending → List top 5 repo names",
  "browserType": "chromium",
  "headless": false,
  "stealth": true,
  "llmProvider": "minimax",
  "llmModel": "auto",
  "maxIterations": 8
}
```

`llmModel` options: `auto` (default → minimax/minimax-m2.5), `minimax/minimax-m2.5`, `google/gemma-4-31b-it`, `deepseek/deepseek-v4-flash`.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Required
MINIMAX_API_KEY=your_key_here
MINIMAX_BASE_URL=https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1

# LLM
LLM_MODEL=minimax/minimax-m2.5
LLM_TEMPERATURE=0.2

# Browser
BROWSER_TYPE=chromium
HEADLESS=false
STEALTH=true

# Server
HOST=0.0.0.0
PORT=8000
```

---

## Docker

```bash
docker build -t automation-agent .
docker run -p 8000:8000 --env-file .env automation-agent
```

The container sets `HEADLESS=true` automatically via `IN_DOCKER=true`.

---

## Input Format

Browser Agent understands tasks in the form:

```
Go to [url] → [what to do]
```

Examples:
- `Go to github.com/trending → List top 5 repo names and star counts`
- `Go to google.com/search?q=weather+Hanoi → Extract temperature only`
- `Go to practicetestautomation.com/practice-test-login/ → Login with student/Password123 → Extract result message`

**Limitations:** CAPTCHA, 2FA, file uploads are not supported.
