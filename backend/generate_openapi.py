"""Generate the OpenAPI specification without running the server."""

import json
from pathlib import Path

from fastapi.openapi.utils import get_openapi

from app.main import app

OUTPUT_PATH = Path(__file__).with_name("openapi.json")


def generate_openapi_spec():
    """Generate OpenAPI specification JSON file from FastAPI app."""
    with OUTPUT_PATH.open("w") as f:
        json.dump(
            get_openapi(
                title=app.title,
                version=app.version,
                openapi_version=app.openapi_version,
                description=app.description,
                routes=app.routes,
            ),
            f,
            indent=2,
        )
    print(f"OpenAPI spec generated at {OUTPUT_PATH}")


if __name__ == "__main__":
    generate_openapi_spec()
