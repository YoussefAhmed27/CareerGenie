import asyncio
from app.tailoring.services.cache import cache_store, generate_text_hash
from app.tailoring.services.preprocessor import preprocess_cv_text
from app.tailoring.services.parser import parse_cv
from app.tailoring.services.extractor import extract_jd_requirements
from app.tailoring.services.scorer import score_and_rank_cv
from app.tailoring.services.tailor_engine import run_tailoring_pipeline
from app.tailoring.validator import validate_tailored_cv
from app.tailoring.services.renderer import render_markdown
from app.tailoring.schemas.output import TailoringResponse

async def orchestrate_tailoring(cv_text: str, jd_text: str) -> TailoringResponse:
    """
    Master orchestration pipeline.
    Replaces the giant single prompt with deterministic structured processing.
    """
    # 1. Preprocess
    clean_cv_text = preprocess_cv_text(cv_text)
    
    # Cache setup (for deterministic skipping)
    cv_hash = generate_text_hash(clean_cv_text)
    jd_hash = generate_text_hash(jd_text) if jd_text else "empty_jd"
    
    parsed_cv = await cache_store.get(f"parsed_cv_{cv_hash}")
    extracted_jd = await cache_store.get(f"extracted_jd_{jd_hash}")
    
    # 2. Extract JD & Parse CV (Parallel)
    tasks = []
    if not parsed_cv:
        tasks.append(parse_cv(clean_cv_text))
    else:
        async def mock_cv(): return parsed_cv
        tasks.append(mock_cv())
        
    if not extracted_jd:
        tasks.append(extract_jd_requirements(jd_text))
    else:
        async def mock_jd(): return extracted_jd
        tasks.append(mock_jd())
        
    results = await asyncio.gather(*tasks)
    parsed_cv = results[0]
    extracted_jd = results[1]
    
    # Save to cache
    await cache_store.set(f"parsed_cv_{cv_hash}", parsed_cv)
    await cache_store.set(f"extracted_jd_{jd_hash}", extracted_jd)

    # 3. Score & Rank
    ranked_cv = score_and_rank_cv(parsed_cv, extracted_jd)
    
    # 4. Tailor Sections (Parallel execution inside tailor_engine)
    tailored_cv = await run_tailoring_pipeline(ranked_cv, extracted_jd)
    
    # 5. Validate
    validated_cv = validate_tailored_cv(tailored_cv, parsed_cv)
    
    # 5.5 Enforce Mandatory Summary (Deterministic Fallback)
    if not validated_cv.summary or not validated_cv.summary.text.strip():
        latest_title = parsed_cv.experience[0].job_title if parsed_cv.experience else "Professional"
        
        # 1. Skills
        top_skills = parsed_cv.skills[:3] if parsed_cv.skills else []
        skills_text = ", ".join(top_skills) if top_skills else "industry-standard tools"
        
        # 2. Domain (Use JD domain terminology to avoid repeating job title)
        domain = "relevant industry"
        if extracted_jd and extracted_jd.domain_terminology:
            domain = extracted_jd.domain_terminology[0].lower()
            
        # 3. Determine Academic vs Default
        academic_keywords = {"research", "graduate", "phd", "postdoc", "professor", "academic", "university", "faculty", "fellow"}
        is_academic = any(kw in latest_title.lower() for kw in academic_keywords)
        
        if is_academic:
            fallback_text = f"{latest_title} focused on {domain}. Experienced in {skills_text}."
        else:
            fallback_text = f"{latest_title} with experience in {skills_text}. Works in {domain} contexts."
        
        validated_cv.summary.text = fallback_text
        validated_cv.summary.source_evidence = ["Programmatic Fallback"]
        
    # 6. Render
    final_markdown = render_markdown(validated_cv, parsed_cv)
    
    # 7. Generate cv_id and cache the output for downloads
    import uuid
    cv_id = str(uuid.uuid4())
    # Store with a TTL or simply set it (in-memory will stay until cleared or evicted)
    await cache_store.set(f"cv_output_{cv_id}", final_markdown)
        
    return TailoringResponse(
        cv_id=cv_id,
        tailored_cv_markdown=final_markdown
    )
