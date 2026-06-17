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

# The Vite dev proxy targets port 8001, so run the backend there in dev:
PORT=8001 python -m backend.main
# Server: http://localhost:8001
```

> The code default is `PORT=8000`; the Vite dev server proxies `/api` and `/ws` to **8001**, so use `PORT=8001` locally (or change the proxy target in `frontend/vite.config.js`).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
# Dev server: http://localhost:5173 (proxies API/WS → backend on 8001)
```

> In production, the frontend is built (`npm run build`) and served as static files by FastAPI at `/` — no proxy, single origin.

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
4. Agent loop: LLM (MiniMax M2.5) reads the page state → decides action → browser-use executes it over **CDP** (Chrome DevTools Protocol) → repeat
5. After each step the backend broadcasts progress over WebSocket (live step list)
6. Frontend shows live step updates (🚀 → 🔄 → ✅); on completion displays the extracted result, the per-step breakdown, and screenshot thumbnails (click to enlarge)

> **Note on the browser engine:** browser-use drives Chromium directly via CDP — Playwright is used only to install and locate the Chromium binary, not to control the page or take screenshots. Each task runs in a **fresh throwaway profile** (`tempfile.mkdtemp`), so no cookies or logins persist between tasks.

---

## Performance & Behavior

- **Flash mode** (`flash_mode=True`) — the agent's LLM output schema is stripped of `thinking` / `evaluation` / `next_goal`, so each step's response is much smaller. Benchmarked **~3–5× faster** wall-time (e.g. a github-trending extraction dropped from ~84s to ~14–25s) with no loss of correctness on extraction and multi-step login tasks. Most of the remaining latency is MiniMax LLM time (~93%), not the browser.
- **Ranking guidance** — a short `extend_system_message` tells the agent to read the relevant metric and **sort** before answering "top N / best / highest" tasks, instead of returning items in page-appearance order.
- **Judge disabled** (`use_judge=False`) — browser-use's built-in judge is informational only (never overrides success) and costs an extra LLM call, so it's turned off to cut latency.
- **Screenshots** — browser-use already captures a screenshot per step via CDP (regardless of vision), so surfacing them is essentially free. They're downscaled to 900px JPEG (~40 KB each, capped at the last 6) before being sent over WebSocket. Vision input to the LLM stays **off** (`use_vision=False`) to keep calls fast.

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

### Task Status — Response Shape

`GET /api/v1/task/{task_id}` (and each WebSocket `task_update`) returns:

```json
{
  "task_id": "ab12cd34",
  "status": "completed",
  "result": "Top 5 GitHub Trending Repositories: ...",
  "steps": ["Step 1: ...", "✅ Done — 2 steps in 19.5s"],
  "step_details": [{ "step": 1, "action": "{'navigate': ...}", "evaluation": "..." }],
  "screenshots": ["data:image/jpeg;base64,..."],
  "duration": 19.5
}
```

- `step_details` — per-step action + the agent's reasoning (shown as the expandable step list in the UI)
- `screenshots` — downscaled JPEG data URIs (rendered as thumbnails; click to enlarge). Sent only on the final completion/error broadcast, not on each live step, to keep payloads small.

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
- ✅ Extract structured data from tables, lists, text (sorts correctly for "top N" tasks)
- ✅ Login flows (no 2FA/CAPTCHA)
- ✅ Multi-step workflows (load more, pagination, etc.)
- ✅ Returns per-step breakdown + screenshots for each completed task

**Limitations:**
- ❌ CAPTCHA, 2FA/MFA, file uploads
- ❌ Mobile/app-only sites
- ❌ JavaScript-heavy SPAs that need extended wait times

---

## Related Agents

### [per-agent-young](https://github.com/TranqBuong/per-agent-young)

A multi-agent QA engineering system that automatically analyzes software requirements and generates test cases, test data, and automation code through a three-agent pipeline:

---

## Development Notes

- **WebSocket:** realtime task updates over `/ws` (auto-reconnect on disconnect)
- **State:** tasks stored in-memory on the backend; restart clears all tasks (oldest finished tasks are evicted past 100)
- **Browser profile:** each task gets a fresh `tempfile.mkdtemp` profile — no login/cookie persistence between tasks. To deliberately persist sessions, set `user_data_dir` on the `BrowserProfile` in `agent.py`.
- **Screenshots:** captured by browser-use over CDP, downscaled with Pillow (900px JPEG); Pillow is warmed at module load so the first task pays no codec-init cost.
- **Logging:** detailed LLM calls + step traces at INFO level; set `DEBUG=true` for verbose request/response content
- **Production:** frontend is pre-built and served as static files by FastAPI; vite dev-server is dev-only

> **Port gotcha:** the dev backend should run on `PORT=8001` to match the Vite proxy; Docker/production listens on `8080`. If a previous backend is still holding the port, free it with `lsof -ti :8001 | xargs kill -9`.
