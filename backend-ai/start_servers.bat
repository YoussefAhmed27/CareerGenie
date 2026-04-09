@echo off
echo Starting AI Microservices...

:: main server
start "Main AI Server (Port 8000)" cmd /k "C:\Users\youss\OneDrive\Desktop\careerGeniePrototype\venv\Scripts\python.exe -m uvicorn main:app --port 8000" 
:: proctor server
start "Proctor Server (Port 8001)" cmd /k "C:\Users\youss\OneDrive\Desktop\careerGeniePrototype\venv\Scripts\python.exe proctor_server.py"
:: mer server
start "MER Server" cmd /k "C:\Users\youss\anaconda3\envs\careergenie\python.exe mer_server.py"

echo All Servers started!