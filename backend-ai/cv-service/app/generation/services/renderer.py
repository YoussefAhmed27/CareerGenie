from app.generation.schemas.generated_cv import GeneratedCV


def render_generated_cv_markdown(cv: GeneratedCV) -> str:
    """
    Renders GeneratedCV into recruiter-style markdown.
    Deterministic formatting layer.
    """

    md = []

    # =========================
    # Contact Section
    # =========================
    md.append(f"# {cv.name}")

    contact_parts = []

    if cv.phone:
        contact_parts.append(cv.phone)

    if cv.email:
        contact_parts.append(cv.email)

    if cv.linkedin:
        contact_parts.append(cv.linkedin)

    if contact_parts:
        md.append(" | ".join(contact_parts))

    md.append("\n---\n")

    # =========================
    # Professional Summary
    # =========================
    if cv.summary and cv.summary.text:
        md.append("## Professional Summary")
        md.append(cv.summary.text)
        md.append("\n---\n")

    # =========================
    # Skills
    # =========================
    if cv.skills:
        md.append("## Technical Skills")
        for category, skills in cv.skills.items():
            if skills:
                md.append(f"- **{category}**: {', '.join(skills)}")
        md.append("\n---\n")

    # =========================
    # Education
    # =========================
    if cv.education:
        md.append("## Education")
        for edu in cv.education:
            year = edu.year if edu.year and edu.year != 'N/A' else ''
            md.append(f'<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="text-align:left;"><strong>{edu.degree}</strong>, {edu.institution}</td><td style="text-align:right;font-style:italic;color:#555;">{year}</td></tr></table>')
        md.append("\n---\n")

    # =========================
    # Experience
    # =========================
    if cv.experience:
        md.append("## Experience")

        for exp in cv.experience:
            md.append(f"### {exp.job_title} — {exp.company}")

            meta = []

            if exp.dates:
                meta.append(exp.dates)

            if exp.location:
                meta.append(exp.location)

            if meta:
                if len(meta) == 2:
                    md.append(f'<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="text-align:left;font-style:italic;color:#555;">{meta[0]}</td><td style="text-align:right;font-style:italic;color:#555;">{meta[1]}</td></tr></table>')
                else:
                    md.append(f'<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="text-align:left;font-style:italic;color:#555;"></td><td style="text-align:right;font-style:italic;color:#555;">{meta[0]}</td></tr></table>')

            for bullet in exp.bullets:
                md.append(f"- {bullet}")

            md.append("")

        md.append("---\n")

    # =========================
    # Projects
    # =========================
    if cv.projects:
        md.append("## Projects")

        for proj in cv.projects:
            md.append(f"### {proj.name}")
            
            if proj.tech_stack:
                md.append(f"**Tech Stack:** {', '.join(proj.tech_stack)}")
                md.append("")

            for bullet in proj.bullets:
                md.append(f"- {bullet}")

            md.append("")

        md.append("---\n")

    # =========================
    # Certifications
    # =========================
    if cv.certifications:
        md.append("## Certifications")

        for cert in cv.certifications:
            md.append(f"- {cert}")

        md.append("\n---\n")

    # =========================
    # Languages
    # =========================
    if cv.languages:
        md.append("## Languages")
        md.append(f"- {', '.join(cv.languages)}")

    return "\n".join(md)