
# Backend Makefile

.PHONY: install dev test lint format check clean

# Default target
all: install check

# Install dependencies
install:
	uv sync --extra dev

# Run development server
dev:
	uv run uvicorn app.main:app --reload

# Run tests with coverage
test:
	uv run pytest

# Lint code using ruff
lint:
	uv run ruff check .

# Format code using ruff
format:
	uv run ruff format .

# comprehensive check (lint + test)
check: lint test

# Clean up cache files
clean:
	rm -rf .pytest_cache
	rm -rf .ruff_cache
	rm -rf __pycache__
	find . -type d -name "__pycache__" -exec rm -rf {} +
