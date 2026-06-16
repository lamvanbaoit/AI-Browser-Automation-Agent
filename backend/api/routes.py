"""
REST API Routes
"""
import re
import time
import uuid
import asyncio
import logging
from datetime import datetime
from typing import Dict, Any

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel

from backend.core.config import config

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["api"])

# In-memory storage
tasks: Dict[str, Dict[str, Any]] = {}
_running_tasks: Dict[str, asyncio.Task] = {}


async def _broadcast_task(task_id: str, include_screenshots: bool = False):
    """Push task state to all WebSocket clients.

    During live steps, skip screenshots (large base64) to keep payloads small.
    Only send screenshots on final completion/error.
    """
    from backend.api.websocket import manager

    t = tasks.get(task_id)
    if not t:
        return
    try:
        payload: Dict[str, Any] = {
            "task_id": task_id,
            "status": t.get("status", ""),
            "task": t.get("task", ""),
            "result": t.get("result", ""),
            "error": t.get("error", ""),
            "steps": t.get("steps", []),
            "step_details": t.get("step_details", []),
            "created_at": t.get("created_at", ""),
            "duration": t.get("duration", 0.0),
        }
        if include_screenshots:
            payload["screenshots"] = t.get("screenshots", [])
        await manager.broadcast({"type": "task_update", "task": payload})
    except Exception as e:
        logger.warning(f"[{task_id}] Broadcast failed: {e}")

# Request/Response models
class TaskRequest(BaseModel):
    task: str
    browserType: str = "chromium"
    headless: bool = False
    stealth: bool = True
    llmProvider: str = "minimax"
    llmModel: str = "auto"
    maxIterations: int = 8


class TaskResponse(BaseModel):
    task_id: str
    status: str
    message: str = ""


class TaskStatus(BaseModel):
    task_id: str
    status: str
    task: str
    result: str = ""
    error: str = ""
    steps: list = []
    screenshots: list = []
    step_details: list = []
    created_at: str = ""
    duration: float = 0.0


def _extract_result(raw: str) -> str:
    """Parse clean result text from browser-use output.

    browser-use wraps extracted content in <url>/<query>/<result> XML.
    Literal \\n in the stringified history must be unescaped too.
    """
    # Pull out extracted_content='...' blobs from AgentHistory repr
    candidates = []
    for m in re.finditer(r"extracted_content='(.*?)'(?=,\s*\w+=|\s*\))", raw, re.DOTALL):
        candidates.append(m.group(1))
    text = candidates[-1] if candidates else raw

    # Unescape literal \n sequences
    text = text.replace("\\n", "\n")

    # Extract just the <result>...</result> block if present
    m = re.search(r"<result>\s*(.*?)\s*</result>", text, re.DOTALL)
    if m:
        return m.group(1).strip()

    return text.strip()


async def run_agent_task(task_id: str, task: str, settings: dict):
    """Run the automation task in background."""
    started_at = time.monotonic()
    logger.info(f"[{task_id}] Starting task: {task[:50]}...")
    tasks[task_id]["status"] = "running"
    tasks[task_id]["steps"].append(f"🚀 Starting: {task}")
    await _broadcast_task(task_id)

    try:
        # Import and run agent
        from backend.core.agent import BrowserAutomationAgent

        logger.info(f"[{task_id}] Creating agent...")
        tasks[task_id]["steps"].append("⚙️ Creating browser agent...")

        # Get LLM config from settings or use defaults
        from backend.core.config import config
        llm_config = config.get_llm_config()

        # Auto-detect model based on task type
        task_lower = task.lower()
        is_browser_task = any(url in task_lower for url in [
            # URLs
            'http://', 'https://', 'www.', '.com', '.org', '.net', '.io', '.co', '.app',
            # Navigation
            'go to', 'navigate', 'open', 'visit', 'search', 'browse', 'surf', 'scroll',
            'goto', 'load page', 'redirect',
            # Browser actions
            'click', 'type', 'fill', 'submit', 'clear', 'select', 'check', 'uncheck',
            'hover', 'drag', 'drop', 'screenshot', 'capture', 'download', 'upload',
            'double click', 'right click', 'context menu', 'scroll up', 'scroll down',
            'scroll into', 'scroll to', 'wait for', 'sleep', 'pause',
            # Common websites
            'youtube', 'google', 'facebook', 'twitter', 'instagram', 'tiktok', 'github',
            'reddit', 'linkedin', 'amazon', 'ebay', 'netflix', 'whatsapp', 'telegram',
            'discord', 'slack', 'zoom', 'teams', 'outlook', 'gmail', 'yahoo',
            'wikipedia', 'bing', 'duckduckgo', 'baidu', 'aliexpress', 'shopee', 'lazada',
            # Form elements
            'button', 'link', 'input', 'field', 'checkbox', 'radio', 'dropdown',
            'select', 'option', 'textarea', 'form', 'menu', 'modal', 'popup', 'alert',
            'dialog', 'tooltip', 'notification', 'toast', 'spinner', 'loader',
            'placeholder', 'label', 'legend', 'fieldset', 'required', 'disabled',
            # Navigation elements
            'tab', 'window', 'back', 'forward', 'refresh', 'reload', 'close',
            'minimize', 'maximize', 'fullscreen', 'address bar', 'url bar',
            'home button', 'bookmarks', 'history', 'downloads',
            # Auth
            'login', 'logout', 'sign in', 'sign up', 'register', 'password', 'username',
            'email', 'verify', 'captcha', 'otp', '2fa', 'mfa', 'reset password',
            # Shopping
            'cart', 'checkout', 'wishlist', 'product', 'price', 'order', 'buy',
            'add to cart', 'remove from cart', 'promo code', 'coupon', 'discount',
            'shipping', 'payment', 'billing', 'address', 'coupon',
            # Media
            'video', 'audio', 'play', 'pause', 'stop', 'mute', 'unmute', 'volume',
            'fullscreen', 'exit fullscreen', 'subtitles', 'captions', 'stream',
            'music', 'podcast', 'playlist', 'skip', 'rewind', 'forward',
            # Data
            'table', 'row', 'column', 'cell', 'filter', 'sort', 'search result',
            'pagination', 'next page', 'previous page', 'load more', 'infinite scroll',
            # Interaction
            'wait', 'load', 'render', 'display', 'show', 'hide', 'expand', 'collapse',
            'toggle', 'open menu', 'close menu', 'switch', 'change', 'update',
            # Clipboard
            'copy', 'paste', 'cut', 'select all', 'highlight', 'select text',
            'copy text', 'paste text', 'duplicate',
            # Settings
            'cookie', 'cache', 'bookmark', 'history', 'extension', 'permission',
            'settings', 'preferences', 'privacy', 'security', 'account',
            # Developer
            'console', 'inspect', 'element', 'network', 'api', 'ajax', 'fetch',
            'request', 'response', 'header', 'cookie', 'local storage', 'session',
            # Browser
            'browser', 'page', 'web', 'website', 'url', 'address bar', 'viewport',
            'header', 'footer', 'sidebar', 'navbar', 'navigation', 'breadcrumb'
        ])

        base_url = config.MINIMAX_BASE_URL

        # Respect the user's explicit choice from Settings; only auto-detect
        # when the user leaves the model on "auto" (or unset).
        user_model = (settings.get("llmModel") or "").strip()
        user_provider = (settings.get("llmProvider") or "").strip()

        if user_model and user_model.lower() not in ("auto", "default"):
            llm_provider = user_provider or "minimax"
            llm_model = user_model
            logger.info(f"[{task_id}] Using user-selected {llm_provider}/{llm_model}")
        elif is_browser_task:
            # Vision task -> minimax/minimax-m2.5
            llm_provider = "gemini"
            llm_model = "minimax/minimax-m2.5"
            logger.info(f"[{task_id}] Auto-detected vision task -> {llm_provider}/{llm_model}")
        else:
            # Text task -> use minimax-m2.5
            llm_provider = "minimax"
            llm_model = "minimax/minimax-m2.5"
            logger.info(f"[{task_id}] Auto-detected text task -> {llm_provider}/{llm_model}")

        # Get API key from config (all via MiniMax API)
        llm_api_key = config.MINIMAX_API_KEY

        # Create agent with all settings
        # config.HEADLESS=True means the server forces headless (e.g. Docker, no display)
        headless = True if config.HEADLESS else settings.get("headless", False)
        agent = BrowserAutomationAgent(
            task=task,
            browser_type=settings.get("browserType", "chromium"),
            headless=headless,
            stealth=settings.get("stealth", True),
            llm_provider=llm_provider,
            llm_model=llm_model,
            llm_temperature=llm_config.get("temperature", 0.2),
            llm_api_key=llm_api_key,
            llm_base_url=base_url,
            max_iterations=settings.get("maxIterations", 10),
        )

        logger.info(f"[{task_id}] Running agent...")
        tasks[task_id]["steps"].append("🌐 Running agent...")

        async def on_step(step: dict):
            tasks[task_id]["step_details"].append(step)
            tasks[task_id]["steps"].append(f"Step {step['step']}: {step['action']}")
            await _broadcast_task(task_id, include_screenshots=False)

        # Run the task
        result = await agent.run(task, step_callback=on_step)

        logger.info(f"[{task_id}] Result: {result.get('status')}")

        duration = round(time.monotonic() - started_at, 1)

        if result.get("status") == "success":
            logger.info(f"[{task_id}] ✅ Setting status to completed")

            screenshots = result.get("screenshots", [])
            if screenshots:
                tasks[task_id]["screenshots"] = screenshots

            # step_details already accumulated live via on_step callback — don't overwrite
            step_details = tasks[task_id]["step_details"]
            tasks[task_id]["steps"] = [
                f"Step {s['step']}: {s['action'][:80]}" for s in step_details
            ]
            tasks[task_id]["steps"].append(
                f"✅ Done — {len(step_details)} steps in {duration}s"
            )

            result_str = str(result.get("result", ""))
            extracted = _extract_result(result_str)
            tasks[task_id]["result"] = extracted[:2000]
            tasks[task_id]["duration"] = duration
            tasks[task_id]["status"] = "completed"
        else:
            tasks[task_id]["status"] = "error"
            tasks[task_id]["error"] = result.get("error", "Unknown error")
            tasks[task_id]["duration"] = round(time.monotonic() - started_at, 1)
            tasks[task_id]["steps"].append(f"❌ Error: {result.get('error')}")

        await _broadcast_task(task_id, include_screenshots=True)

    except Exception as e:
        logger.error(f"[{task_id}] Task failed: {e}", exc_info=True)
        tasks[task_id]["status"] = "error"
        tasks[task_id]["error"] = str(e)
        tasks[task_id]["steps"].append(f"❌ Error: {e}")
        await _broadcast_task(task_id, include_screenshots=True)


@router.post("/task", response_model=TaskResponse)
async def create_task(request: TaskRequest, background_tasks: BackgroundTasks) -> TaskResponse:
    """Create a new automation task."""
    # Evict oldest completed/error tasks when over limit to prevent memory growth
    MAX_TASKS = 100
    if len(tasks) >= MAX_TASKS:
        finished = [tid for tid, t in tasks.items() if t["status"] in ("completed", "error", "stopped")]
        for tid in finished[:len(tasks) - MAX_TASKS + 1]:
            tasks.pop(tid, None)

    task_id = str(uuid.uuid4())[:8]

    tasks[task_id] = {
        "id": task_id,
        "task": request.task,
        "status": "pending",
        "result": "",
        "error": "",
        "steps": [],
        "step_details": [],
        "screenshots": [],
        "created_at": datetime.now().isoformat(),
    }

    logger.info(f"Created task {task_id}: {request.task[:50]}...")
    logger.info(f"[{task_id}] Request details: {request}")

    # Run agent in background
    settings = {
        "browserType": request.browserType,
        "headless": request.headless,
        "stealth": request.stealth,
        "llmProvider": request.llmProvider,
        "llmModel": request.llmModel,
        "maxIterations": request.maxIterations,
    }
    loop = asyncio.get_event_loop()
    t = loop.create_task(run_agent_task(task_id, request.task, settings))
    _running_tasks[task_id] = t
    t.add_done_callback(lambda _: _running_tasks.pop(task_id, None))

    logger.info(f"[{task_id}] ✅ Task created, returning response to frontend")

    return TaskResponse(
        task_id=task_id,
        status="pending",
        message="Task created, running in background"
    )


@router.get("/task/{task_id}", response_model=TaskStatus)
async def get_task_status(task_id: str) -> TaskStatus:
    """Get task status."""
    logger.info(f"[{task_id}] 📡 GET /task/{task_id}")
    if task_id not in tasks:
        logger.warning(f"[{task_id}] ❌ Task not found")
        raise HTTPException(status_code=404, detail="Task not found")

    task = tasks[task_id]
    logger.info(f"[{task_id}] 📥 Returning task status: {task.get('status')}")
    return TaskStatus(
        task_id=task_id,
        status=task["status"],
        task=task["task"],
        result=task.get("result", ""),
        error=task.get("error", ""),
        steps=task.get("steps", []),
        screenshots=task.get("screenshots", []),
        step_details=task.get("step_details", []),
        created_at=task.get("created_at", ""),
        duration=task.get("duration", 0.0),
    )


@router.get("/tasks")
async def list_tasks() -> list:
    """List all tasks."""
    logger.info("📡 GET /tasks")
    result = [
        {
            "task_id": tid,
            "status": t["status"],
            "task": t["task"][:50] if t["task"] else "",
            "created_at": t.get("created_at", ""),
        }
        for tid, t in tasks.items()
    ]
    logger.info(f"✅ Returning {len(result)} tasks")
    return result


@router.delete("/task/{task_id}")
async def delete_task(task_id: str) -> dict:
    """Delete a task."""
    logger.info(f"[{task_id}] 🗑️ DELETE /task/{task_id}")
    if task_id not in tasks:
        logger.warning(f"[{task_id}] ❌ Task not found for deletion")
        raise HTTPException(status_code=404, detail="Task not found")

    del tasks[task_id]
    logger.info(f"[{task_id}] ✅ Task deleted")
    return {"status": "deleted", "task_id": task_id}


@router.post("/task/{task_id}/stop")
async def stop_task(task_id: str) -> dict:
    """Stop a running task."""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")

    t = _running_tasks.pop(task_id, None)
    if t and not t.done():
        t.cancel()

    tasks[task_id]["status"] = "stopped"
    return {"status": "stopped", "task_id": task_id}


@router.post("/clear")
async def clear_tasks() -> dict:
    """Clear all tasks."""
    tasks.clear()
    return {"status": "cleared"}


# ── QA Agent proxy ──────────────────────────────────────────────────────────
import asyncio as _asyncio
import urllib.request as _urllib_request
import json as _json

_QA_BASE = "https://endpoint-9e403801-44eb-4baa-94f6-4d1446fb3b40.agentbase-runtime.aiplatform.vngcloud.vn"


class QAAnalyzeRequest(BaseModel):
    text: str


class QATestCasesRequest(BaseModel):
    scenarios: list


def _post_json_sync(url: str, body: dict) -> dict:
    data = _json.dumps(body).encode()
    req = _urllib_request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
    with _urllib_request.urlopen(req, timeout=60) as resp:
        return _json.loads(resp.read())


@router.post("/qa/analyze")
async def qa_analyze(request: QAAnalyzeRequest):
    """Proxy: analyze requirements → scenarios."""
    try:
        result = await _asyncio.get_event_loop().run_in_executor(
            None, _post_json_sync, f"{_QA_BASE}/analyze-requirements", {"text": request.text}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))


@router.post("/qa/test-cases")
async def qa_test_cases(request: QATestCasesRequest):
    """Proxy: scenarios → test cases."""
    try:
        result = await _asyncio.get_event_loop().run_in_executor(
            None, _post_json_sync, f"{_QA_BASE}/generate-test-cases", {"scenarios": request.scenarios}
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e))