import time
import os
import shutil
import json
import gc
import torch
import subprocess as sp
import uvicorn
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware 
from mer_engine import MERPipeline

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Booting up CareerGenie MER Server...")
pipeline = None

@app.post("/api/analyze_interview")
async def analyze_interview(
    video: UploadFile = File(...),
    qa_intervals: str = Form(None)
):
    global pipeline
    
    print(f"Received video: {video.filename}")
    
    # Only load MER when video available
    if pipeline is None:
        print("Booting MER Engine into VRAM for analysis...")
        pipeline = MERPipeline(weights_path="./models/best_careergenie_endtoend.pth")
    
    run_id = int(time.time())
    raw_temp = f"raw_{run_id}.webm"
    fixed_temp = f"fixed_{run_id}.mp4"

    with open(raw_temp, "wb") as buffer:
        shutil.copyfileobj(video.file, buffer)

    try:
        parsed_intervals = json.loads(qa_intervals) if qa_intervals else None

        print(f"Fixing metadata for {video.filename}...")
        sp.run(['ffmpeg', '-y', '-i', raw_temp, '-c', 'copy', fixed_temp], capture_output=True)

        # Process the interview
        report_data = pipeline.process_interview(fixed_temp, qa_intervals=parsed_intervals)

        # save report
        session_id = video.filename.replace("interview_", "").replace(".webm", "")
        report_path = f"report_{session_id}.txt"
        
        with open(report_path, "w", encoding="utf-8") as f:
            f.write("==================================================\n")
            f.write(f"CAREERGENIE Q&A HR REPORT: SESSION {session_id}\n")
            f.write("==================================================\n\n")
            for answer in report_data:
                f.write(f"{answer['segment']} ({answer['time_window']})\n")
                f.write(f"Transcript: {answer['transcript']}\n")
                f.write(f"Metrics: {answer['metrics']}\n")
                
                if 'speech_analytics' in answer:
                    f.write(f"Speech Analytics: {answer['speech_analytics']}\n")
                else:
                    f.write("Speech Analytics: N/A\n")
                    
                f.write("-" * 50 + "\n")

        print(f"Report saved successfully to: {report_path}")
        return {"status": "complete", "data": report_data}

    except Exception as e:
        print(f"ERROR: {str(e)}")
        return {"status": "error", "error": str(e)}

    finally:
        for f in [raw_temp, fixed_temp]:
            if os.path.exists(f):
                os.remove(f)

        pipeline = None
        gc.collect()
        
        # Force PyTorch to return the memory to Windows
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
            torch.cuda.ipc_collect() # Clears inter-process memory
            

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8002)