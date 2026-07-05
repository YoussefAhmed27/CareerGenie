# Local Setup Guide

This document provides the current steps required to run CareerGenie locally.

## 1. Prerequisites
Ensure the following are installed:
- Node.js 18+
- Python 3.10+
- Docker Desktop
- Git
- Anaconda or Miniconda (only required for the MER-based AI service)

From the repository root, switch to the correct branch:

```powershell
git checkout CareerGenieV1
```

## 2. Environment Configuration
Create the following files as needed.

### Root .env
```env
DB_USER=admin
DB_PASSWORD=your_local_db_password_here
DB_NAME=careergenie
DB_HOST=localhost
DB_PORT=5432
PGSSLMODE=disable
```

### backend-node/.env
```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_USER=admin
DB_PASSWORD=your_local_db_password_here
DB_NAME=careergenie
JWT_SECRET=replace_me
JWT_REFRESH_SECRET=replace_me
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
CLIENT_ORIGIN=http://localhost:5173
```

Optional for Google login:
```env
GOOGLE_CLIENT_ID=your_google_client_id_here
```

### backend-ai/.env
```env
GROQ_API_KEY=replace_me
GEMINI_API_KEY=replace_me
DEEPGRAM_API_KEY=replace_me
```

### frontend/.env
```env
VITE_CV_SERVICE_URL=http://localhost:8002
```

## 3. Install Dependencies
Run the following from the repository root:

```powershell
cd backend-node
npm install

cd ../frontend
npm install

cd ../backend-ai
python -m venv venv
./venv/Scripts/Activate.ps1
pip install -r requirements.txt
```

If you want to use the MER-specific service, create the Conda environment as well:

```powershell
conda env create -f environment.yml
```

## 4. Start Infrastructure Services
Start Docker Desktop, then run:

```powershell
docker compose up -d db minio createbucket piston
```

This starts the database, object storage, and code execution service required by the application.

## 5. Start the Core Application
Open separate terminals and run the following commands.

### Terminal 1: Node backend
```powershell
cd backend-node
npm run dev
```

### Terminal 2: Frontend
```powershell
cd frontend
npm run dev
```

### Terminal 3: CV service
```powershell
cd backend-ai/cv-service
python -m uvicorn app.main:app --port 8002
```

Open the application in your browser at:
- http://localhost:5173

## 6. Optional AI Interview Services
These services are required only for the full interview simulation experience.

### Terminal 4: AI main server
```powershell
cd backend-ai
./venv/Scripts/Activate.ps1
python -m uvicorn main:app --port 8000
```

### Terminal 5: Proctor server
```powershell
cd backend-ai
./venv/Scripts/Activate.ps1
python proctor_server.py
```

### Terminal 6: MER server
```powershell
cd backend-ai
conda run -n careergenie python mer_server.py
```
