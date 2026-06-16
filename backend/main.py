"""
Main entry point - FastAPI server with uvicorn
"""
import os
import sys
import logging
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from fastapi import FastAPI, Request, WebSocket
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse

from backend.api import routes
from backend.api.websocket import handle_websocket, manager
from backend.core.config import config

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Browser Automation API",
    description="AI-powered browser automation with FastAPI",
    version="1.0.0",
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"[UNHANDLED] {request.method} {request.url.path} → {type(exc).__name__}: {exc}")
    return JSONResponse(status_code=500, content={"detail": str(exc), "type": type(exc).__name__})


# Include routers
app.include_router(routes.router)


# WebSocket endpoint
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket for realtime updates."""
    await handle_websocket(websocket)


# Serve built frontend (dist)
frontend_path = Path(__file__).parent.parent / "frontend"
dist_path = frontend_path / "dist"

if dist_path.exists():
    assets_path = dist_path / "assets"
    if assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_path)), name="assets")


@app.get("/health")
async def health():
    return {"status": "healthy"}


@app.get("/favicon.ico")
async def favicon():
    from fastapi import Response
    return Response(status_code=204)


@app.get("/")
async def root():
    index_path = dist_path / "index.html"
    if index_path.exists():
        with open(index_path) as f:
            return HTMLResponse(f.read())
    return {"message": "Browser Automation API", "docs": "/docs"}


@app.get("/{full_path:path}")
async def spa_catch_all(full_path: str):
    index_path = dist_path / "index.html"
    if index_path.exists():
        with open(index_path) as f:
            return HTMLResponse(f.read())
    from fastapi import HTTPException
    raise HTTPException(status_code=404)


def main():
    """Run the server."""
    import uvicorn

    host = config.HOST
    port = config.PORT
    debug = config.DEBUG

    logger.info("=" * 50)
    logger.info("Starting Browser Automation API")
    logger.info("=" * 50)
    logger.info(f"Server: http://{host}:{port}")
    logger.info(f"Debug: {debug}")
    logger.info("=" * 50)

    uvicorn.run(
        "backend.main:app",
        host=host,
        port=port,
        reload=debug,
    )


if __name__ == "__main__":
    main()