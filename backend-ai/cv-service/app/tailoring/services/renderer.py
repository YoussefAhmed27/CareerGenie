from app.tailoring.schemas.output import TailoredCV
from app.tailoring.schemas.cv import ParsedCV

def render_markdown(tailored_cv: TailoredCV, original_cv: ParsedCV) -> str:
    """
    Deterministically renders the tailored CV JSON into a recruiter-grade Markdown string.
    This guarantees formatting consistency and removes LLM layout hallucinations.
    """
    md = []
    
    # 1. Contact Info
    c = original_cv.contact
    name = c.name if c.name else "Candidate Name"
    md.append(f"# {name}")
    
    contact_parts = []
    if c.phone: contact_parts.append(c.phone)
    if c.email: contact_parts.append(c.email)
    if c.linkedin: contact_parts.append(c.linkedin)
    if c.location: contact_parts.append(c.location)
    
    if contact_parts:
        md.append(" | ".join(contact_parts))
    md.append("\n---\n")

    # 2. Summary
    if tailored_cv.summary and tailored_cv.summary.text:
        md.append("## Professional Summary")
        md.append(tailored_cv.summary.text)
        md.append("\n---\n")

    # 3. Education (Original, untouched for honesty)
    if original_cv.education:
        md.append("## Education")
        for edu in original_cv.education:
            md.append(f"- **{edu.degree}**, {edu.institution}, {edu.date}")
            for det in edu.details:
                md.append(f"  - {det}")
        md.append("\n---\n")

    # 4. Technical Skills (Tailored/Locked)
    if tailored_cv.skills:
        md.append("## Technical Skills")
        # Since skills pipeline is locked, it's a flat list from parsed CV
        md.append(f"- {', '.join(tailored_cv.skills)}")
        md.append("\n---\n")

    # 5. Experience (Tailored)
    if tailored_cv.experience:
        md.append("## Experience")
        for exp in tailored_cv.experience:
            md.append(f"### {exp.job_title} — {exp.company}")
            date_loc = []
            if exp.dates: date_loc.append(exp.dates)
            if exp.location: date_loc.append(exp.location)
            if date_loc:
                md.append(" | ".join(date_loc))
                
            for b in exp.bullets:
                md.append(f"- {b.text}")
            md.append("")
        md.append("---\n")

    # 6. Projects (Tailored)
    if tailored_cv.projects:
        md.append("## Projects")
        for proj in tailored_cv.projects:
            md.append(f"### {proj.name}")
            for b in proj.bullets:
                md.append(f"- {b.text}")
            md.append("")
        md.append("---\n")

    return "\n".join(md)

