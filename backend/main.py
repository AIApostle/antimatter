"""Antimotion EDA Platform Backend Entrypoint.

Starts FastAPI server with CORS, mounts routes, and initializes EDA engine.
"""

from dotenv import load_dotenv
load_dotenv()

import logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("antimatter")
logger.info("🚀 Antimatter EDA Platform Backend Initializing...")

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from src.api.routes import router as api_router

app = FastAPI(
    title="Antimotion EDA API",
    description="Multimodal Natural Language PCB & Schematic Design Platform",
    version="1.0.0",
)

# CORS configuration for local React Vite studio
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.get("/health")
async def health_check():
    return {"status": "online", "platform": "Antimotion EDA Engine v1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
