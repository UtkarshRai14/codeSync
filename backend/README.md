# CodeSync Backend

Real-time collaborative coding platform API built with FastAPI and WebSockets.

## Prerequisites

- Python 3.13+
- [uv](https://github.com/astral-sh/uv) (fast Python package installer and resolver)

## API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI Json**: `http://localhost:8000/openapi.json`

## Development Setup

You can use `make` commands if available, or direct `uv` commands.

### Using Makefile

```bash
# Install dependencies, run linting and tests
make all

# Run development server
make dev

# Run tests
make test

# Format code
make format
```

### Using uv directly

```bash
# Install dependencies
uv sync --extra dev

# Run development server
uv run uvicorn app.main:app --reload

# Run tests
uv run pytest

# Run linting
uv run ruff check .

# Format code
uv run ruff format .
```

## API Endpoints

- `POST /api/sessions` - Create new interview session
- `GET /api/sessions/{session_id}` - Get session details
- `DELETE /api/sessions/{session_id}` - Delete session
- `WS /ws/{session_id}` - WebSocket for real-time collaboration

