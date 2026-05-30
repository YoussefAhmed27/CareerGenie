import os
import json
import asyncio
from typing import Type, TypeVar, Any
from groq import AsyncGroq
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

T = TypeVar('T', bound=BaseModel)

async def call_llm_structured(
    system_prompt: str, 
    user_content: str, 
    response_model: Type[T],
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.0,
    max_retries: int = 3
) -> T:
    """
    Calls Groq and forces JSON output matching the Pydantic response_model.
    """
    schema = response_model.model_json_schema()
    system_prompt_with_schema = (
        f"{system_prompt}\n\n"
        f"You MUST return ONLY valid JSON that strictly conforms to this JSON schema:\n"
        f"{json.dumps(schema, indent=2)}\n"
        f"Do not include any markdown fences, explanations, or text outside the JSON object."
    )

    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt_with_schema},
                    {"role": "user", "content": user_content}
                ],
                temperature=temperature,
                response_format={"type": "json_object"}
            )
            
            raw_content = response.choices[0].message.content.strip()
            # Pydantic validation
            parsed_data = response_model.model_validate_json(raw_content)
            return parsed_data
            
        except Exception as e:
            last_error = e
            print(f"[LLM STRUCTURED RETRY {attempt}] Failed: {str(e)}")
            await asyncio.sleep(1.0)

    raise Exception(f"Structured LLM Call Failed after {max_retries} retries: {str(last_error)}")

async def call_llm_text(
    system_prompt: str, 
    user_content: str, 
    model: str = "llama-3.3-70b-versatile",
    temperature: float = 0.2,
    max_retries: int = 3
) -> str:
    """Standard text completion for writing bullet points and summaries."""
    last_error = None
    for attempt in range(1, max_retries + 1):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_content}
                ],
                temperature=temperature,
                max_tokens=2000
            )
            return response.choices[0].message.content.strip()
            
        except Exception as e:
            last_error = e
            print(f"[LLM TEXT RETRY {attempt}] Failed: {str(e)}")
            await asyncio.sleep(1.0)

    raise Exception(f"Text LLM Call Failed after {max_retries} retries: {str(last_error)}")
