import os
import pathlib
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import Response, HTMLResponse
from typing import Optional

from app.tailoring.pipeline import orchestrate_tailoring
from app.tailoring.schemas.output import TailoringResponse
from app.tailoring.services.cache import cache_store
from app.tailoring.services.exporter import export_to_pdf, export_to_docx
from app.utils.parser import extract_text_from_cv

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]
MAX_SIZE = 5 * 1024 * 1024

MAX_JD_TEXT_LENGTH = 10_000       # characters

def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Failed to delete temp file {path}: {e}")

@router.post("/upload", response_model=TailoringResponse)
async def upload_for_tailoring(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    jd_text: Optional[str] = Form(default=None),
):
    try:
        # 1. Validate CV file type
        if file.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail="Invalid file type. Upload a PDF or DOCX.")

        # 2. Read & validate CV file size
        cv_content = await file.read()
        if len(cv_content) > MAX_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 5MB).")

        # 3. Save to disk temporarily
        safe_name = pathlib.Path(file.filename).name
        filename = f"tailor_{uuid.uuid4()}_{safe_name}"
        cv_path = os.path.join(UPLOAD_DIR, filename)
        with open(cv_path, "wb") as f:
            f.write(cv_content)
            
        # Schedule cleanup immediately
        background_tasks.add_task(remove_file, cv_path)

        # 4. Extract Text
        cv_extracted = extract_text_from_cv(cv_path)
        if not cv_extracted.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from CV.")

        # 5. Validate JD
        resolved_jd_text = None
        if jd_text and jd_text.strip():
            if len(jd_text) > MAX_JD_TEXT_LENGTH:
                raise HTTPException(status_code=400, detail=f"Job description too long (max {MAX_JD_TEXT_LENGTH} chars).")
            resolved_jd_text = jd_text.strip()

        # 6. Process CV directly using the deterministic orchestration pipeline
        result_model = await orchestrate_tailoring(cv_text=cv_extracted, jd_text=resolved_jd_text)
            
        # Pydantic models need to be returned directly or dumped. FastAPI handles BaseModel return types directly.
        return result_model

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "429" in error_msg:
            raise HTTPException(status_code=429, detail="Daily analysis limit reached. Please try again in 40 minutes.")
        print("UPLOAD CV TAILOR ERROR:", error_msg)
        raise HTTPException(status_code=500, detail="Internal server error.")

@router.get("/download/pdf")
async def download_pdf(cv_id: str):
    """Generates and returns a PDF of the tailored CV based on the cached markdown."""
    md_text = await cache_store.get(f"cv_output_{cv_id}")
    if not md_text:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please generate it again.")
        
    try:
        pdf_bytes = export_to_pdf(md_text)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=tailored_cv.pdf"}
        )
    except Exception as e:
        print("PDF EXPORT ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate PDF.")

@router.get("/download/docx")
async def download_docx(cv_id: str):
    """Generates and returns a DOCX of the tailored CV based on the cached markdown."""
    md_text = await cache_store.get(f"cv_output_{cv_id}")
    if not md_text:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please generate it again.")
        
    try:
        docx_bytes = export_to_docx(md_text)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": "attachment; filename=tailored_cv.docx"}
        )
    except Exception as e:
        print("DOCX EXPORT ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate DOCX.")

@router.get("/download/preview", response_class=HTMLResponse)
async def download_preview(cv_id: str):
    """Returns an HTML preview of the tailored CV."""
    md_text = await cache_store.get(f"cv_output_{cv_id}")
    if not md_text:
        raise HTTPException(status_code=404, detail="CV not found or expired. Please generate it again.")
        
    import markdown
    html_content = markdown.markdown(md_text)
    
    # Wrap in basic HTML for nice viewing
    styled_html = f"""
    <html>
    <head>
        <title>CV Preview</title>
        <style>
            body {{ font-family: sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }}
            h1 {{ text-align: center; border-bottom: 2px solid #eee; padding-bottom: 10px; }}
            h2 {{ color: #333; margin-top: 20px; }}
        </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    return HTMLResponse(content=styled_html)
