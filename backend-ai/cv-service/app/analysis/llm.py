from groq import AsyncGroq
import os
from dotenv import load_dotenv
import json

load_dotenv()
client = AsyncGroq(api_key=os.getenv("GROQ_API_KEY"))

async def call_llm(system_prompt: str, user_content: str, schema_dict: dict) -> str:
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_content}
        ],
        temperature=0.1,  # Kept low for factual consistency but allowing slight qualitative nuance
        max_tokens=4000,
        tools=[{
            "type": "function",
            "function": {
                "name": "generate_cv_analysis",
                "description": "Generate a highly structured recruiter-quality CV analysis.",
                "parameters": schema_dict,
            }
        }],
        tool_choice={"type": "function", "function": {"name": "generate_cv_analysis"}},
        timeout=25
    )
    
    # Extract the JSON argument from the tool call
    tool_calls = response.choices[0].message.tool_calls
    if tool_calls and len(tool_calls) > 0:
        return tool_calls[0].function.arguments
        
    # Fallback to standard content if tool call fails somehow
    return response.choices[0].message.content.strip()
