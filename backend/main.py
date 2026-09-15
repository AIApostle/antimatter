"""Antimotion EDA Platform Backend Entrypoint.

Starts FastAPI server with CORS, mounts routes, and initializes EDA engine.
"""

from dotenv import load_dotenv
load_dotenv()

import os
import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
for name in ("httpx", "httpcore", "postgrest", "supabase"):
    _l = logging.getLogger(name)
    _l.setLevel(logging.WARNING)
    _l.propagate = False

logger = logging.getLogger("antimatter")
logger.info("🚀 Antimatter EDA Platform Backend Initializing...")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router as api_router
from src.auth.routes import router as auth_router

app = FastAPI(
    title="Antimotion EDA API",
    description="Multimodal Natural Language PCB & Schematic Design Platform",
    version="1.0.0",
)

# CORS configuration supporting localhost and production Render URL
allowed_origins = [
    "https://antimatter-3p10.onrender.com",
    "http://localhost:5173",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:8000",
]

env_origins = os.getenv("CORS_ORIGINS")
if env_origins:
    allowed_origins.extend([o.strip() for o in env_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?|https://.*\.onrender\.com",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)
app.include_router(auth_router, prefix="/api")


@app.get("/health")
async def health_check():
    return {"status": "online", "platform": "Antimotion EDA Engine v1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
