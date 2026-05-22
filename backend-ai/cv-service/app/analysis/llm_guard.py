import json
import asyncio
from app.analysis.llm import call_llm
from app.analysis.schemas import CVAnalysisResult

async def safe_llm_json(system_prompt: str, user_content: str, max_retries: int = 3, delay: float = 1.0) -> CVAnalysisResult:
    last_error = None
    schema_dict = CVAnalysisResult.model_json_schema()

    for attempt in range(1, max_retries + 1):
        try:
            raw = await call_llm(system_prompt=system_prompt, user_content=user_content, schema_dict=schema_dict)
            # Pydantic enforces our strict schema on load
            json_data = json.loads(raw)
            validated = CVAnalysisResult(**json_data)
            return validated
            
        except Exception as e:
            last_error = e
            print(f"[LLM RETRY {attempt}] Failed: {str(e)}")
            await asyncio.sleep(delay)

    # Do not return a fake success dict. Fail loudly so the API returns a 500 error.
    raise Exception(f"LLM_FAILED_VALIDATION after {max_retries} retries: {str(last_error)}")
