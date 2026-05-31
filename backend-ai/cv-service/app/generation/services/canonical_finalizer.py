from app.generation.schemas.profile import CandidateProfile
from app.generation.services.semantic_deduplicator import compute_jaccard_similarity, merge_bullets

def finalize_canonical_profile(profile: CandidateProfile) -> CandidateProfile:
    """
    Final structural consistency layer to guarantee ZERO semantic duplication 
    across the full CandidateProfile object.
    Runs globally over the entire profile.
    """
    final_profile = profile.model_copy(deep=True)
    
    # Use direct references to the lists for in-place modifications
    exps = final_profile.experience
    projs = final_profile.projects
    
    system_keywords = ["system", "platform", "app", "tool", "engine", "api", "analyzer", "generator"]
    implied_roles = ["intern", "engineer", "developer", "freelancer", "consultant", "analyst", "manager", "lead"]

    # 1. Intra-section Deduplication: Experience
    i = 0
    while i < len(exps):
        j = i + 1
        while j < len(exps):
            title_sim = compute_jaccard_similarity(exps[i].job_title, exps[j].job_title)
            
            text_i = exps[i].job_title + " " + exps[i].company + " " + " ".join(exps[i].bullets)
            text_j = exps[j].job_title + " " + exps[j].company + " " + " ".join(exps[j].bullets)
            text_sim = compute_jaccard_similarity(text_i, text_j)
            
            if title_sim >= 0.75 or text_sim >= 0.60:
                # Merge j into i
                exps[i].bullets = merge_bullets(exps[i].bullets, exps[j].bullets)
                # Keep richer metadata
                if len(exps[j].job_title) > len(exps[i].job_title): 
                    exps[i].job_title = exps[j].job_title
                if exps[j].company and not exps[i].company: 
                    exps[i].company = exps[j].company
                # Delete duplicate
                exps.pop(j)
            else:
                j += 1
        i += 1

    # 2. Intra-section Deduplication: Projects
    i = 0
    while i < len(projs):
        j = i + 1
        while j < len(projs):
            name_sim = compute_jaccard_similarity(projs[i].name, projs[j].name)
            
            text_i = projs[i].name + " " + " ".join(projs[i].bullets)
            text_j = projs[j].name + " " + " ".join(projs[j].bullets)
            text_sim = compute_jaccard_similarity(text_i, text_j)
            
            if name_sim >= 0.75 or text_sim >= 0.60:
                projs[i].bullets = merge_bullets(projs[i].bullets, projs[j].bullets)
                if len(projs[j].name) > len(projs[i].name): 
                    projs[i].name = projs[j].name
                projs.pop(j)
            else:
                j += 1
        i += 1

   # =========================================================================
    # 3. Cross-section Deduplication (Experience vs Projects) - Fix Pattern
    # =========================================================================
    proj_indices_to_delete = set()
    exp_indices_to_delete = set()

    for i, proj in enumerate(projs):
        proj_text = proj.name + " " + " ".join(proj.bullets)
        
        for j, exp in enumerate(exps):
            if j in exp_indices_to_delete:
                continue  # Skip experiences already absorbed elsewhere

            title_sim = compute_jaccard_similarity(proj.name, exp.job_title)
            text_sim = compute_jaccard_similarity(proj_text, exp.job_title + " " + exp.company + " " + " ".join(exp.bullets))
            
            # Match Boundary Check
            if title_sim >= 0.75 or text_sim >= 0.60:
                is_system = any(sk in exp.job_title.lower() for sk in system_keywords)
                has_role = any(role in exp.job_title.lower() for role in implied_roles)
                
                if has_role and not is_system:
                    # CASE A: Real corporate role context -> Keep Experience, absorb Project
                    exp.bullets = merge_bullets(exp.bullets, proj.bullets)
                    proj_indices_to_delete.add(i)
                    break  # Project is completely absorbed; stop comparing it
                else:
                    # CASE B: System/Side-Project named like a role -> Keep Project, absorb Experience
                    proj.bullets = merge_bullets(proj.bullets, exp.bullets)
                    if len(exp.job_title) > len(proj.name):
                        proj.name = exp.job_title
                    exp_indices_to_delete.add(j)
                    # Do not break here! The project remains alive and can swallow other matching fragments

    # Rebuild collection arrays safely post-loop without out-of-bounds indexing bugs
    final_profile.projects = [p for idx, p in enumerate(projs) if idx not in proj_indices_to_delete]
    final_profile.experience = [e for idx, e in enumerate(exps) if idx not in exp_indices_to_delete]

    return final_profile