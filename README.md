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
│   │   ├── routes.py        # REST task endpoints + WebSocket broadcast
│   │   └── websocket.py     # WebSocket realtime updates
│   └── core/
│       ├── agent.py         # BrowserAutomationAgent (browser-use)
│       └── config.py        # .env configuration
│
├── frontend/
│   └── src/
│       ├── App.jsx          # Main app + task submission + realtime updates
│       ├── components/
│       │   └── ChatBox.jsx   # Chat UI for browser automation
│       └── hooks/
│           └── useWebSocket.js  # WebSocket with auto-reconnect
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
5. After each step, the backend broadcasts progress over WebSocket
6. Frontend shows live step updates (🚀 → 🔄 → ✅); on completion displays the extracted result

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

- `llmModel`: `auto` (default) or `minimax/minimax-m2.5`
- `maxIterations`: max steps before agent gives up (default: 8)

---

## Environment Variables

Copy `.env.example` to `.env` and fill in your values:

```bash
# Required — MiniMax API credentials (VNG Cloud MaaS)
MINIMAX_API_KEY=your_api_key_here
MINIMAX_BASE_URL=https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1

# LLM Settings
LLM_PROVIDER=minimax
LLM_MODEL=minimax/minimax-m2.5
LLM_TEMPERATURE=0.2

# Browser Settings
BROWSER_TYPE=chromium
HEADLESS=false
STEALTH=true
VIEWPORT=1920,1080
TIMEOUT=30000

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=false
```

---

## Docker

```bash
docker build -t automation-agent .
docker run -p 8080:8080 --env-file .env automation-agent
```

The container:
- Sets `HEADLESS=true` automatically
- Listens on port 8080 (configurable via `PORT`)
- Includes Chromium via the official playwright/python base image
- Serves the built frontend at `/`

---

## Task Format

Browser Agent understands tasks in the form:

```
Go to [url] → [what to do]
```

Examples:
- `Go to github.com/trending → List top 5 repo names and star counts`
- `Go to google.com/search?q=weather+Hanoi → Extract temperature only`
- `Go to practicetestautomation.com/practice-test-login/ → Login with student/Password123 → Extract result message`

**Capabilities:**
- ✅ Navigate to URLs, click links, fill forms
- ✅ Extract structured data from tables, lists, text
- ✅ Login flows (no 2FA/CAPTCHA)
- ✅ Multi-step workflows (load more, pagination, etc.)

**Limitations:**
- ❌ CAPTCHA, 2FA/MFA, file uploads
- ❌ Mobile/app-only sites
- ❌ JavaScript-heavy SPAs that need extended wait times

---

## Development Notes

- **WebSocket:** realtime task updates over `/ws` (auto-reconnect on disconnect)
- **State:** tasks stored in-memory on the backend; restart clears all tasks
- **Logging:** detailed LLM calls + step traces at INFO level; set `DEBUG=true` for verbose request/response content
- **Production:** frontend is pre-built and served as static files by FastAPI; vite dev-server is dev-only
