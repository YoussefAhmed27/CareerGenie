import io
import markdown
from xhtml2pdf import pisa
from docx import Document
from docx.shared import Pt
import re

def export_to_pdf(md_text: str) -> bytes:
    """
    Converts Markdown text to a PDF file in-memory using xhtml2pdf.
    """
    if not md_text:
        return b""
        
    # Convert Markdown to HTML
    html_content = markdown.markdown(md_text)
    
    # Add basic styling to make the PDF look like a CV
    styled_html = f"""
    <html>
    <head>
    <style>
        @page {{
            size: A4;
            margin: 2cm;
        }}
        body {{
            font-family: Helvetica, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333333;
        }}
        h1 {{ font-size: 20pt; text-align: center; color: #111111; margin-bottom: 5px; }}
        h2 {{ font-size: 14pt; color: #222222; border-bottom: 1px solid #cccccc; padding-bottom: 3px; margin-top: 15px; margin-bottom: 10px; }}
        h3 {{ font-size: 12pt; color: #333333; margin-top: 10px; margin-bottom: 5px; }}
        p {{ margin-bottom: 8px; }}
        ul {{ margin-top: 0px; margin-bottom: 10px; padding-left: 20px; }}
        li {{ margin-bottom: 4px; }}
        hr {{ border: 0; border-bottom: 1px solid #dddddd; margin: 10px 0; }}
    </style>
    </head>
    <body>
        {html_content}
    </body>
    </html>
    """
    
    pdf_buffer = io.BytesIO()
    
    # Create PDF
    pisa_status = pisa.CreatePDF(styled_html, dest=pdf_buffer)
    
    if pisa_status.err:
        raise Exception("Failed to generate PDF from Markdown")
        
    return pdf_buffer.getvalue()

def export_to_docx(md_text: str) -> bytes:
    """
    Converts Markdown text to a DOCX file in-memory.
    Implements a line-by-line parser to map Markdown syntax to Word Document elements.
    """
    document = Document()
    
    # Basic CV styling adjustments for the default styles
    style = document.styles['Normal']
    font = style.font
    font.name = 'Arial'
    font.size = Pt(11)
    
    lines = md_text.split('\n')
    
    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
            
        if stripped == '---':
            # docx doesn't have a simple horizontal rule, we could add an empty paragraph with a bottom border
            # but for simplicity we'll just skip it or add a blank line
            document.add_paragraph()
            continue
            
        if stripped.startswith('# '):
            # Title
            title_text = stripped[2:].strip()
            title = document.add_heading(title_text, level=0)
            title.alignment = 1 # Center
        elif stripped.startswith('## '):
            # Heading 1
            document.add_heading(stripped[3:].strip(), level=1)
        elif stripped.startswith('### '):
            # Heading 2
            document.add_heading(stripped[4:].strip(), level=2)
        elif stripped.startswith('- '):
            # Bullet point
            # Check if there is bold text inside
            bullet_text = stripped[2:].strip()
            p = document.add_paragraph(style='List Bullet')
            _add_formatted_text(p, bullet_text)
        else:
            # Normal text / paragraph
            # Might be contact info with " | "
            p = document.add_paragraph()
            _add_formatted_text(p, stripped)
            
    docx_buffer = io.BytesIO()
    document.save(docx_buffer)
    return docx_buffer.getvalue()

def _add_formatted_text(paragraph, text: str):
    """Helper to parse **bold** tags and add them to a docx paragraph."""
    # Split text by **
    parts = re.split(r'(\*\*.*?\*\*)', text)
    for part in parts:
        if part.startswith('**') and part.endswith('**'):
            # It's bold
            run = paragraph.add_run(part[2:-2])
            run.bold = True
        else:
            paragraph.add_run(part)
