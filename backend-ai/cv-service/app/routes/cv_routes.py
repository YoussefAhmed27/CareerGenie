import os
import pathlib
import re
import uuid
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from typing import Optional

from app.analysis.analyzer import analyze_cv
from app.analysis.schemas import CVAnalysisResult
from app.utils.parser import extract_text_from_cv

router = APIRouter()

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
]
MAX_SIZE = 5 * 1024 * 1024

MAX_JD_TEXT_LENGTH = 10_000

EMAIL_RE = re.compile(r"(?<![\w.+-])[\w.+-]+@[\w-]+(?:\.[\w-]+)+(?![\w.+-])")


def remove_file(path: str):
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception as e:
        print(f"Failed to delete temp file {path}: {e}")


def extract_email(text: str) -> Optional[str]:
    match = EMAIL_RE.search(text or "")
    if not match:
        return None
    return match.group(0).strip().lower()


@router.post("/upload", response_model=CVAnalysisResult)
async def upload_cv(
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
        filename = f"{uuid.uuid4()}_{safe_name}"
        cv_path = os.path.join(UPLOAD_DIR, filename)
        with open(cv_path, "wb") as f:
            f.write(cv_content)

        # Schedule cleanup immediately to prevent disk leaks
        background_tasks.add_task(remove_file, cv_path)

        # 4. Extract Text
        cv_extracted = extract_text_from_cv(cv_path)
        if not cv_extracted.strip():
            raise HTTPException(status_code=400, detail="Could not extract text from CV.")

        # 5. Validate JD
        resolved_jd_text = None
        if jd_text and jd_text.strip():
            if len(jd_text) > MAX_JD_TEXT_LENGTH:
                raise HTTPException(
                    status_code=400,
                    detail=f"Job description too long (max {MAX_JD_TEXT_LENGTH} chars)."
                )
            resolved_jd_text = jd_text.strip()

        # 6. Process CV directly using the analyzer
        result = await analyze_cv(cv_text=cv_extracted, jd_text=resolved_jd_text)

        # HR batch screening additions.
        # These are optional schema fields, so they do not break the existing CV Assistant.
        result.candidate_email = extract_email(cv_extracted)
        result.cv_text = cv_extracted

        return result

    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        if "TEMPLATE_CV" in error_msg:
            raise HTTPException(status_code=400, detail="This appears to be a CV template. Please upload your completed CV.")
        if "429" in error_msg:
            raise HTTPException(status_code=429, detail="Daily analysis limit reached. Please try again in 40 minutes.")
        print("UPLOAD CV ERROR:", error_msg)
        raise HTTPException(status_code=500, detail="Internal server error.")