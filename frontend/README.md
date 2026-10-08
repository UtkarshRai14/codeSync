# CodeSync Frontend

React + TypeScript + Vite client for CodeSync: the landing page, the collaborative Monaco editor, and in-browser code execution (Python via Pyodide, JavaScript in the page).

## Prerequisites

- Node.js 20+
- The backend running on `http://localhost:8000` (see [`../backend`](../backend/README.md))

## Scripts

```bash
npm install            # Install dependencies
npm run dev            # Start the dev server at http://localhost:5173
npm run build          # Type-check and build for production (dist/)
npm run lint           # Run ESLint
npm run test           # Run the test suite once
npm run test:watch     # Run tests in watch mode
npm run test:coverage  # Run tests with a coverage report
```

## Configuration

| Variable       | Default                                                   | Description                                       |
| -------------- | --------------------------------------------------------- | ------------------------------------------------- |
| `VITE_API_URL` | `http://localhost:8000` in development, same origin in production | Backend base URL for REST and WebSocket requests |

In production the built `dist/` is served by the FastAPI backend (see the root `Dockerfile`), so the app talks to the API on the same origin.
