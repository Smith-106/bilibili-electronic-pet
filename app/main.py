from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.admin import router as admin_router
from app.api.comments import router as comments_router
from app.api.gateway import router as gateway_router

@asynccontextmanager
async def lifespan(_: FastAPI):
    yield


app = FastAPI(title="Bilibili Electronic Pet Reply Bot", version="0.1.0", lifespan=lifespan)
app.mount("/static", StaticFiles(directory="app/static"), name="static")


@app.get("/health")
def health():
    return {"ok": True}


app.include_router(comments_router)
app.include_router(gateway_router)
app.include_router(admin_router)
