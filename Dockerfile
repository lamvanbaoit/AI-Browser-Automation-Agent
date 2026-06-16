# ── Stage 1: Build React frontend ─────────────────────────────────────────────
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --legacy-peer-deps
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Python + Playwright (Chromium) ───────────────────────────────────
# Official image ships with all Chromium system deps pre-installed
FROM mcr.microsoft.com/playwright/python:v1.49.0-noble

WORKDIR /app

# Python deps
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Base image already ships Chromium for playwright==1.49.0 — no reinstall needed

# App source
COPY backend/ ./backend/

# Built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# In Docker there is no display — force headless
ENV HEADLESS=true
ENV HOST=0.0.0.0
ENV PORT=8080
# Tell browser-use it's running in Docker so it applies CHROME_DOCKER_ARGS (--no-sandbox etc.)
# Needed because AgentBase uses Kubernetes pods which don't have /.dockerenv
ENV IN_DOCKER=true

EXPOSE 8080

CMD ["python", "-m", "backend.main"]
