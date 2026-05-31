import uuid
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response, HTMLResponse

from app.generation.schemas.profile import CVGenerationRequest
from app.generation.pipeline import orchestrate_cv_generation
# Reuse the tailoring cache store or import a shared one
from app.tailoring.services.cache import cache_store
from app.tailoring.services.exporter import export_to_pdf, export_to_docx

router = APIRouter(prefix="/generation", tags=["CV Generation"])


@router.post("/generate")
async def generate_cv(request: CVGenerationRequest):
    """
    Generates a full CV from structured user input and freeform extra info.
    """
    result = await orchestrate_cv_generation(request)
    return result


@router.get("/download/pdf")
async def download_generated_pdf(cv_id: str):
    """Generates and returns a PDF of the generated CV based on cached markdown."""
    md_text = await cache_store.get(f"gen_cv_output_{cv_id}")
    if not md_text:
        raise HTTPException(status_code=404, detail="Generated CV not found or expired.")
        
    try:
        pdf_bytes = export_to_pdf(md_text)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename=generated_cv_{cv_id}.pdf"}
        )
    except Exception as e:
        print("GENERATED PDF EXPORT ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate PDF.")


@router.get("/download/docx")
async def download_generated_docx(cv_id: str):
    """Generates and returns a DOCX of the generated CV based on cached markdown."""
    md_text = await cache_store.get(f"gen_cv_output_{cv_id}")
    if not md_text:
        raise HTTPException(status_code=404, detail="Generated CV not found or expired.")
        
    try:
        docx_bytes = export_to_docx(md_text)
        return Response(
            content=docx_bytes,
            media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            headers={"Content-Disposition": f"attachment; filename=generated_cv_{cv_id}.docx"}
        )
    except Exception as e:
        print("GENERATED DOCX EXPORT ERROR:", str(e))
        raise HTTPException(status_code=500, detail="Failed to generate DOCX.")


@router.get("/download/preview", response_class=HTMLResponse)
async def preview_generated_cv(cv_id: str):
    """Returns an HTML preview of the generated CV."""
    md_text = await cache_store.get(f"gen_cv_output_{cv_id}")
    if not md_text:
        raise HTTPException(status_code=404, detail="Generated CV not found or expired.")
        
    import markdown
    html_content = markdown.markdown(md_text)
    
    styled_html = f"""
    <html>
    <head>
        <title>Generated CV Preview</title>
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