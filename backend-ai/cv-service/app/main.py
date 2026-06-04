import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.cv_routes import router as cv_router
from app.routes.tailoring_routes import router as tailoring_router
from app.generation.generation_routes import router as generation_router


app = FastAPI(
    title="CV Service",
    version="1.0.0"
)

# Allowed frontend origins for browser requests.
# Hardcoded for now to avoid deployment parsing issues.
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://career-genie-eta.vercel.app",
]

# Optional: also allow extra origins from CV_ALLOWED_ORIGINS if provided.
extra_origins = os.getenv("CV_ALLOWED_ORIGINS", "")
if extra_origins:
    for origin in extra_origins.split(","):
        clean_origin = origin.strip().rstrip("/")
        if clean_origin and clean_origin != "*" and clean_origin not in allowed_origins:
            allowed_origins.append(clean_origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routes
app.include_router(cv_router, prefix="/cv", tags=["CV"])
app.include_router(tailoring_router, prefix="/tailor", tags=["Tailoring"])
app.include_router(generation_router)


@app.get("/")
def root():
    return {"message": "CV Service is running"}


@app.get("/health")
def health_check():
    return {"status": "ok"}