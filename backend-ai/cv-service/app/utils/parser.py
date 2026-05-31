import os
from PyPDF2 import PdfReader
import fitz  # PyMuPDF

def extract_text_from_cv(file_path: str) -> str:
    try:
        ext = os.path.splitext(file_path)[1].lower()

        

        if ext == ".pdf":
            doc = fitz.open(file_path)
            text = ""
            for page in doc:
                text += page.get_text()
            return text.strip()
        
        elif ext == ".docx":
            import docx
            doc = docx.Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs]).strip()

        else:
            raise ValueError("Unsupported file type")

    except Exception as e:
        print("PARSE ERROR:", str(e))
        return ""