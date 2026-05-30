import uuid
from app.generation.schemas.profile import CVGenerationRequest, CandidateProfile
from app.generation.schemas.generated_cv import GeneratedCV

from app.generation.services.intake_parser import extract_entities
from app.generation.services.classifier import classify_entities
from app.generation.services.semantic_deduplicator import deduplicate_entities
from app.generation.services.cv_content_filter import filter_extracted_entities
from app.generation.services.canonical_builder import build_canonical_profile
from app.generation.services.canonical_finalizer import finalize_canonical_profile
from app.generation.services.bullet_normalizer import normalize_canonical_bullets
from app.generation.services.canonical_guard import validate_and_repair_canonical_profile
from app.generation.services.cv_generator import generate_cv
from app.generation.services.renderer import render_generated_cv_markdown
from app.tailoring.services.cache import cache_store  # Import shared singleton cache

async def orchestrate_cv_generation(request: CVGenerationRequest):
    """
    Main CV generation pipeline.
    Enforces a strict, streamlined flow focused on creation and delivery.
    """

    # 1. Intake Parser (LLM extraction only)
    extracted_entities = await extract_entities(request.extra_info)

    # 2. Deterministic Classification Engine (Code-only)
    classified_data = classify_entities(extracted_entities)
    
    # 3. Semantic Deduplication
    deduplicated_data = deduplicate_entities(classified_data)

    # 4. CV CONTENT FILTER (Hard Gate)
    filtered_data = filter_extracted_entities(deduplicated_data)

    # 5. Canonical Builder (Merge structured + classified data)
    raw_profile = build_canonical_profile(request.structured, filtered_data, extracted_entities.skills)

    # 6. CANONICAL FINALIZER (Global Identity Resolution)
    finalized_profile = finalize_canonical_profile(raw_profile)

    # 7. BULLET NORMALIZER (Quality Filter)
    normalized_profile = normalize_canonical_bullets(finalized_profile)

    # 8. Canonical Guard (Validation + Repair ONLY)
    canonical_profile = validate_and_repair_canonical_profile(normalized_profile)

    # 9. CV Generator (LLM Content Generation)
    generated_cv: GeneratedCV = await generate_cv(canonical_profile)

    # 10. Markdown Renderer (Pure formatting)
    markdown_cv = render_generated_cv_markdown(generated_cv)

    # --- Cache Layout & Identifier Generation ---
    cv_id = str(uuid.uuid4())
    await cache_store.set(f"gen_cv_output_{cv_id}", markdown_cv)

    # Return final clean payload enriched with cv_id
    return {
        "cv_id": cv_id,
        "generated_cv": generated_cv,
        "generated_cv_markdown": markdown_cv
    }