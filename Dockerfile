# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files first for caching
COPY frontend/package*.json ./
RUN npm ci

# Copy source and build
COPY frontend/ .
RUN npm run build

# Stage 2: Setup Backend & Final Image
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies (if needed)
# RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

# Install uv for fast python dependency management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Copy backend requirements
COPY backend/pyproject.toml backend/uv.lock* ./backend/

WORKDIR /app/backend

# Install dependencies using uv and lockfile
# Export requirements from uv.lock to ensure reproducible builds
# --no-emit-project prevents installing the current package (which isn't copied yet)
RUN uv export --frozen --format requirements-txt --no-emit-project --output-file requirements.txt
RUN uv pip install --system -r requirements.txt

# Copy backend source
COPY backend/app ./app
COPY backend/pyproject.toml .

# Copy built frontend assets to backend static directory
# Vite output defaults to 'dist', we map it to 'app/static' which main.py expects
COPY --from=frontend-builder /app/frontend/dist ./app/static

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV PORT=8000

# Run application
# Use shell form to allow variable expansion for PORT
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
