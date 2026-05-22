from fastapi import FastAPI
from app.routes.cv_routes import router as cv_router
from app.routes.tailoring_routes import router as tailoring_router

app = FastAPI(
    title="CV Service",
    version="1.0.0"
)

# Register routes
app.include_router(cv_router, prefix="/cv", tags=["CV"])
app.include_router(tailoring_router, prefix="/tailor", tags=["Tailoring"])

@app.get("/")
def root():
    return {"message": "CV Service is running"}