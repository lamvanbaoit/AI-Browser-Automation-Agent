"""
Browser Agent using browser-use library
AI-powered browser automation
"""
import inspect
import logging
import time
from typing import Optional, List, Callable

logger = logging.getLogger(__name__)

try:
    import litellm

    def _llm_success_cb(kwargs, response, start_time, end_time):
        msgs = kwargs.get("messages", [])
        total_chars = sum(len(str(m.get("content", ""))) for m in msgs)
        elapsed = (end_time - start_time).total_seconds()
        usage = getattr(response, "usage", None)
        tokens = f"in={usage.prompt_tokens} out={usage.completion_tokens}" if usage else f"~{total_chars//4} est tokens"
        logger.info(f"[LLM ✅] model={kwargs.get('model')} | {tokens} | {elapsed:.1f}s")

    def _llm_failure_cb(kwargs, exc, start_time, end_time):
        msgs = kwargs.get("messages", [])
        total_chars = sum(len(str(m.get("content", ""))) for m in msgs)
        elapsed = (end_time - start_time).total_seconds() if end_time else "?"
        logger.warning(f"[LLM ❌] model={kwargs.get('model')} | ~{total_chars//4} est tokens | {elapsed}s | {type(exc).__name__}: {str(exc)[:120]}")

    litellm.success_callback = [_llm_success_cb]
    litellm.failure_callback = [_llm_failure_cb]
except Exception:
    pass

try:
    from browser_use import Agent, BrowserProfile, BrowserSession
    from browser_use.llm.openai.chat import ChatOpenAI
    BROWSER_USE_AVAILABLE = True
except ImportError as e:
    BROWSER_USE_AVAILABLE = False
    logger.warning(f"browser-use import error: {e}")


def _supported_fields(cls) -> set:
    """Return the set of constructor parameter names the class accepts."""
    # Pydantic v2 models
    pydantic_fields = getattr(cls, "model_fields", None)
    if pydantic_fields:
        return set(pydantic_fields.keys())
    # Regular classes — inspect __init__ signature
    try:
        return set(inspect.signature(cls.__init__).parameters.keys()) - {"self"}
    except Exception:
        return set()


class BrowserAutomationAgent:
    """AI-powered browser automation agent."""

    def __init__(
        self,
        task: str = "",
        browser_type: str = "chromium",
        headless: bool = False,
        stealth: bool = True,
        viewport: tuple = (1920, 1080),
        timeout: int = 30000,
        llm_provider: str = "gemini",
        llm_model: str = "default",
        llm_temperature: float = 0.7,
        llm_api_key: Optional[str] = None,
        llm_base_url: Optional[str] = None,
        max_iterations: int = 8,
    ):
        self.task = task
        self.browser_type = browser_type
        self.headless = headless
        self.stealth = stealth
        self.viewport = viewport
        self.timeout = timeout
        self.llm_provider = llm_provider
        self.llm_model = llm_model
        self.llm_temperature = llm_temperature
        self.llm_api_key = llm_api_key
        self.llm_base_url = llm_base_url
        self.max_iterations = max_iterations

    def _create_llm(self):
        model_name = self.llm_model if self.llm_model and self.llm_model != "default" else None

        if not model_name:
            if self.llm_provider == "gemini":
                model_name = "minimax/minimax-m2.5"
            else:
                model_name = "minimax/minimax-m2.5"

        logger.info("=" * 50)
        logger.info("🤖 LLM Configuration:")
        logger.info(f"   Provider: {self.llm_provider}")
        logger.info(f"   Model: {model_name}")
        logger.info(f"   Base URL: {self.llm_base_url}")
        logger.info(f"   API Key: {self.llm_api_key[:10] if self.llm_api_key else 'None'}...{self.llm_api_key[-4:] if self.llm_api_key else ''}")
        logger.info(f"   Temperature: {self.llm_temperature}")
        logger.info("=" * 50)

        _llm_kwargs = dict(
            model=model_name,
            api_key=self.llm_api_key,
            base_url=self.llm_base_url,
            temperature=self.llm_temperature,
            max_retries=1,
            timeout=65.0,
        )
        _llm_fields = _supported_fields(ChatOpenAI)
        if "stream_usage" in _llm_fields:
            _llm_kwargs["stream_usage"] = True

        llm = ChatOpenAI(**_llm_kwargs)

        _orig_ainvoke = llm.ainvoke

        # tiktoken for accurate client-side token counting
        try:
            import tiktoken
            _enc = tiktoken.get_encoding("cl100k_base")
            def _count_tokens(text: str) -> int:
                return len(_enc.encode(text))
        except Exception:
            def _count_tokens(text: str) -> int:
                return len(text) // 4

        _call_index = [0]

        async def _logged_ainvoke(input, *args, **kwargs):
            _call_index[0] += 1
            call_id = _call_index[0]

            msgs = input if isinstance(input, list) else [input]
            msg_texts = [str(getattr(m, "content", m)) for m in msgs]
            in_tok_client = sum(_count_tokens(t) for t in msg_texts)

            logger.info(f"[LLM #{call_id} ➡️  REQ] model={model_name} | {len(msgs)} msgs | {in_tok_client} tokens (client-counted)")
            for i, (m, text) in enumerate(zip(msgs, msg_texts)):
                role = getattr(m, "type", type(m).__name__)
                logger.info(f"  msg[{i}] {role} ({_count_tokens(text)} tok / {len(text)} chars): {text[:500]}{'...' if len(text) > 500 else ''}")

            t0 = time.time()
            try:
                result = await _orig_ainvoke(input, *args, **kwargs)
                elapsed = time.time() - t0

                # Extract actual token usage — try every known location
                in_tok_api = out_tok_api = total_tok_api = None

                usage = getattr(result, "usage_metadata", None)
                if usage:
                    in_tok_api = getattr(usage, "input_tokens", None)
                    out_tok_api = getattr(usage, "output_tokens", None)
                    total_tok_api = getattr(usage, "total_tokens", None)

                if in_tok_api is None:
                    rm = getattr(result, "response_metadata", None) or {}
                    tu = (rm.get("token_usage") or rm.get("usage")) if isinstance(rm, dict) else {}
                    if isinstance(tu, dict):
                        in_tok_api = tu.get("prompt_tokens") or tu.get("input_tokens")
                        out_tok_api = tu.get("completion_tokens") or tu.get("output_tokens")
                        total_tok_api = tu.get("total_tokens")

                if in_tok_api is None:
                    ak = getattr(result, "additional_kwargs", None) or {}
                    tu = ak.get("usage") or {}
                    if isinstance(tu, dict):
                        in_tok_api = tu.get("prompt_tokens") or tu.get("input_tokens")
                        out_tok_api = tu.get("completion_tokens") or tu.get("output_tokens")

                content_out = str(getattr(result, "content", result))
                out_tok_client = _count_tokens(content_out)

                if in_tok_api is not None:
                    total_tok_api = total_tok_api or (in_tok_api + (out_tok_api or 0))
                    tok_str = f"in={in_tok_api} out={out_tok_api} total={total_tok_api} tokens (API)"
                else:
                    tok_str = f"in={in_tok_client} out={out_tok_client} total={in_tok_client+out_tok_client} tokens (client-counted, API không trả usage)"

                logger.info(f"[LLM #{call_id} ⬅️  RES] {elapsed:.1f}s | {tok_str}")
                logger.info(f"  response ({out_tok_client} tok / {len(content_out)} chars): {content_out[:500]}{'...' if len(content_out) > 500 else ''}")
                return result
            except Exception as e:
                elapsed = time.time() - t0
                logger.warning(f"[LLM #{call_id} 💥 ERR] {elapsed:.1f}s | {type(e).__name__}: {e}")
                raise

        llm.ainvoke = _logged_ainvoke
        return llm

    def _create_browser_profile(self):
        """Build BrowserProfile, only passing fields the installed version supports."""
        fields = _supported_fields(BrowserProfile)

        kwargs = {"headless": self.headless}

        if "browser_type" in fields:
            kwargs["browser_type"] = self.browser_type
        if "stealth" in fields:
            kwargs["stealth"] = bool(self.stealth)
        if "viewport" in fields:
            kwargs["viewport"] = {"width": self.viewport[0], "height": self.viewport[1]}
        if "timeout" in fields:
            kwargs["timeout"] = self.timeout
        # IN_DOCKER=true env var makes browser-use auto-apply CHROME_DOCKER_ARGS (--no-sandbox etc.)
        # If chromium_sandbox field exists, explicitly disable it as a belt-and-suspenders fallback
        if "chromium_sandbox" in fields:
            kwargs["chromium_sandbox"] = False

        return BrowserProfile(**kwargs)

    def _create_agent(self, task: str, browser_session, llm) -> "Agent":
        """Build Agent, only passing kwargs the installed version supports."""
        fields = _supported_fields(Agent)

        kwargs: dict = {
            "task": task,
            "browser_session": browser_session,
            "llm": llm,
        }

        # Performance flags — skip if version doesn't support them
        if "use_vision" in fields:
            kwargs["use_vision"] = False
        if "max_actions_per_step" in fields:
            kwargs["max_actions_per_step"] = 2
        if "generate_gif" in fields:
            kwargs["generate_gif"] = False
        # Stop after 1 consecutive LLM failure — extract already has the data
        if "max_failures" in fields:
            kwargs["max_failures"] = 2
        # Fires before ChatOpenAI timeout (65s) for clean error handling
        if "llm_timeout" in fields:
            kwargs["llm_timeout"] = 60.0
        # Return last extracted content when max_failures hit
        if "final_response_after_failure" in fields:
            kwargs["final_response_after_failure"] = True
        # browser-use requires max_history_items > 5 or None; use minimum allowed
        if "max_history_items" in fields:
            kwargs["max_history_items"] = 6
        # Cap total input to browser-use so it truncates browser_state automatically
        if "max_input_tokens" in fields:
            kwargs["max_input_tokens"] = 6000
        # Only keep attributes agent needs to act — cuts DOM verbosity significantly
        if "include_attributes" in fields:
            kwargs["include_attributes"] = ["id", "name", "type", "href", "role", "aria-label", "placeholder", "value"]

        return Agent(**kwargs)

    async def run(self, task: str, step_callback: Optional[Callable] = None) -> dict:
        """Run automation task.

        step_callback: optional async callable(step: dict) called after each step.
        """
        if not BROWSER_USE_AVAILABLE:
            return {"status": "error", "error": "browser-use not installed"}

        step_details: List[dict] = []
        step_count = 0

        async def on_step_start(agent):
            pass

        async def on_step_end(agent):
            nonlocal step_count
            step_count += 1

            try:
                history = getattr(agent, "history", None)
                raw_steps = getattr(agent, "steps", [])

                latest = None
                if hasattr(history, "steps") and history.steps:
                    latest = history.steps[-1]
                elif hasattr(history, "__getitem__") and len(history) > 0:
                    latest = history[-1]
                elif raw_steps:
                    latest = raw_steps[-1]

                if latest:
                    action_info = ""
                    if hasattr(latest, "action") and latest.action:
                        action_info = str(latest.action)
                    elif hasattr(latest, "actions") and latest.actions:
                        action_info = str(latest.actions[0])

                    evaluation = ""
                    if hasattr(latest, "evaluation") and latest.evaluation:
                        evaluation = str(latest.evaluation)

                    step = {
                        "step": step_count,
                        "action": action_info[:200],
                        "evaluation": evaluation[:200],
                    }
                    step_details.append(step)
                    logger.info(f"[Step {step_count}] {action_info[:50]}...")

                    if step_callback:
                        await step_callback(step)

            except Exception as e:
                logger.warning(f"[Step capture] Error: {e}")

        try:
            browser_profile = self._create_browser_profile()
            browser_session = BrowserSession(browser_profile=browser_profile)
            llm = self._create_llm()
            agent = self._create_agent(task, browser_session, llm)

            result = await agent.run(
                max_steps=self.max_iterations,
                on_step_start=on_step_start,
                on_step_end=on_step_end,
            )

            # Extract final result using browser-use API (avoid string repr parsing)
            result_text = ""
            try:
                if hasattr(result, "final_result"):
                    result_text = result.final_result() or ""
            except Exception:
                pass
            if not result_text:
                try:
                    if hasattr(result, "extracted_content"):
                        contents = [c for c in result.extracted_content() if c]
                        result_text = contents[-1] if contents else ""
                except Exception:
                    pass

            # If still no content, check action-level errors in history before
            # falling back to the raw object repr (which triggers the "raw dump" warning).
            if not result_text:
                try:
                    all_results = getattr(result, "all_results", None) or []
                    errors = [r.error for r in all_results if getattr(r, "error", None)]
                    if errors:
                        return {
                            "status": "error",
                            "error": errors[0],
                            "screenshots": [],
                            "step_details": step_details,
                        }
                except Exception:
                    pass

            if not result_text:
                result_text = str(result) if result else "Completed"

            return {
                "status": "success",
                "task": task,
                "result": result_text,
                "screenshots": [],
                "step_details": step_details,
            }

        except Exception as e:
            logger.error(f"Agent run error: {e}")
            return {"status": "error", "error": str(e)}


AutomationAgent = BrowserAutomationAgent
