"""
WebSocket handlers for realtime updates
"""
import json
import logging
from typing import Dict, Set

from fastapi import WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        """Connect a new client."""
        await websocket.accept()
        self.active_connections.add(websocket)
        logger.info(f"Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        """Disconnect a client."""
        self.active_connections.discard(websocket)
        logger.info(f"Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        """Broadcast message to all clients."""
        dead = set()
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception as e:
                logger.error(f"Broadcast error: {e}")
                dead.add(connection)
        self.active_connections -= dead


manager = ConnectionManager()


async def handle_websocket(websocket: WebSocket):
    """Handle WebSocket connection."""
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            # Handle different message types
            msg_type = message.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})
            elif msg_type == "subscribe":
                # Subscribe to task updates
                task_id = message.get("task_id")
                await websocket.send_json({
                    "type": "subscribed",
                    "task_id": task_id
                })
            else:
                logger.warning(f"Unknown message type: {msg_type}")

    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket)