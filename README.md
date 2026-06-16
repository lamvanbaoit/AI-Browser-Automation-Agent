# 🤖 Automation Agent

> Browser automation using FastAPI + browser-use + LiteLLM + React

## 🚀 Quick Start

```bash
# Backend
source .venv/bin/activate
pip install -r requirements.txt
python -m backend.main

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
```

- **Backend**: http://localhost:8000
- **Frontend**: http://localhost:5173

---

## 📁 Project Structure

```
automation-agent/
├── backend/                    # FastAPI server
│   ├── api/
│   │   ├── routes.py        # REST API
│   │   └── websocket.py    # WebSocket
│   ├── core/
│   │   ├── agent.py       # browser-use agent
│   │   └── config.py     # .env config
│   ├── llm/
│   │   └── provider.py   # LiteLLM
│   └── main.py           # uvicorn entry
│
├── frontend/                  # React + Vite + TailwindCSS
│   ├── src/
│   │   ├── components/   # React components
│   │   │   ├── ChatBox.jsx
│   │   │   ├── BrowserView.jsx
│   │   │   ├── SettingsPanel.jsx
│   │   │   └── HistoryList.jsx
│   │   ├── hooks/       # Custom hooks
│   │   │   └── useWebSocket.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── .env                     # API keys
└── requirements.txt         # Dependencies
```

---

## 🛠️ API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/task` | Create automation task |
| GET | `/api/v1/task/{task_id}` | Get task status |
| GET | `/api/v1/tasks` | List all tasks |
| DELETE | `/api/v1/task/{task_id}` | Delete task |
| POST | `/api/v1/task/{task_id}/stop` | Stop running task |
| POST | `/api/v1/clear` | Clear all tasks |
| WS | `/ws` | WebSocket for realtime updates |

---

## ⚙️ Features

### Backend
- **FastAPI**: Async/await server
- **browser-use**: AI-powered element detection
- **LiteLLM**: Unified LLM API
- **WebSocket**: Realtime logs & screenshots

### Frontend (React + Vite)
- **Modern UI**: React 18 + TailwindCSS
- **Split view**: Chat + Browser Preview
- **Tabs**: Run, Browser, Settings, History
- **Lucide Icons**: Beautiful icon set

---

## 📝 Environment Variables

```bash
# Browser Settings
BROWSER_TYPE=chromium
HEADLESS=false
STEALTH=true
VIEWPORT=1920,1080
TIMEOUT=30000

# LLM Settings
LLM_PROVIDER=gemini
LLM_MODEL=minimax/minimax-m2.5
LLM_TEMPERATURE=0.2

# API Keys
MINIMAX_API_KEY=your_key
MINIMAX_BASE_URL=https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1

OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://api.openai.com/v1

ANTHROPIC_API_KEY=your_key
ANTHROPIC_BASE_URL=https://api.anthropic.com/v1
```

---

## 📦 Dependencies

### Backend
```
fastapi>=0.109.0
uvicorn>=0.27.0
python-dotenv>=1.0.0
playwright>=1.40.0
browser-use>=0.1.0
litellm>=1.0.0
requests>=2.31.0
pydantic>=2.0.0
```

### Frontend
```json
{
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "lucide-react": "^0.300.0"
}
```

---

*Updated: 2026-06-14*