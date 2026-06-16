"""
Configuration management - Load settings from .env
"""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()


class Config:
    """Application configuration."""

    # Browser settings
    BROWSER_TYPE: str = os.getenv("BROWSER_TYPE", "chromium")
    HEADLESS: bool = os.getenv("HEADLESS", "false").lower() == "true"
    STEALTH: bool = os.getenv("STEALTH", "true").lower() == "true"
    VIEWPORT: tuple = tuple(map(int, os.getenv("VIEWPORT", "1920,1080").split(",")))
    TIMEOUT: int = int(os.getenv("TIMEOUT", "30000"))

    # LLM settings
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "minimax")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "minimax/minimax-m2.5")
    LLM_TEMPERATURE: float = float(os.getenv("LLM_TEMPERATURE", "0.2"))

    # MiniMax API (only)
    MINIMAX_API_KEY: str = os.getenv("MINIMAX_API_KEY", "")
    MINIMAX_BASE_URL: str = os.getenv("MINIMAX_BASE_URL", "https://maas-llm-aiplatform-hcm.api.vngcloud.vn/v1")

    # Server settings
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"

    @classmethod
    def get_llm_config(cls) -> dict:
        """Get LLM configuration - MiniMax only."""
        return {
            "api_key": cls.MINIMAX_API_KEY,
            "base_url": cls.MINIMAX_BASE_URL,
            "model": cls.LLM_MODEL,
            "temperature": cls.LLM_TEMPERATURE,
        }


config = Config()