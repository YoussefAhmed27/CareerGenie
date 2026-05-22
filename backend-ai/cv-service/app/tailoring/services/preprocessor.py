import re

def preprocess_cv_text(text: str) -> str:
    """
    Deterministically cleans CV text before it hits any LLM processing.
    Removes dummy text, normalizes whitespace, and trims irrelevant sections.
    """
    if not text:
        return ""

    # 1. Normalize whitespace
    text = re.sub(r'\r\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # 2. Normalize bullet points
    text = re.sub(r'^[\u2022\u2023\u25E6\u2043\u2219]\s+', '- ', text, flags=re.MULTILINE)
    text = re.sub(r'^\*\s+', '- ', text, flags=re.MULTILINE)
    
    # 3. Remove known dummy text and placeholders
    placeholders = [
        r"Title\.",
        r"\(Year\)\.",
        r"other authors",
        r"Manuscript in preparation",
        r"\[insert.*?\]",
        r"TBD"
    ]
    for p in placeholders:
        text = re.sub(p, '', text, flags=re.IGNORECASE)

    # 4. Remove standard references section if it's at the end
    # Match "References" and everything after it if it's the last section
    ref_match = re.search(r'\n(?:#+\s*)?References\s*\n(.*)', text, flags=re.IGNORECASE | re.DOTALL)
    if ref_match:
        # Check if it looks like a real section (more than 150 chars might mean it's not just "Available upon request")
        # Usually, we just strip it to save tokens
        text = text[:ref_match.start()]
    else:
        # Catch "References available upon request"
        text = re.sub(r'References available upon request\.?', '', text, flags=re.IGNORECASE)

    # 5. Final cleanup of empty lines
    text = re.sub(r'\n{3,}', '\n\n', text).strip()
    return text
