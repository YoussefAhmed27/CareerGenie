# CareerGenie Setup Guide

## 0. Make sure you are on CareerGenieV1 branch in VS Code (this is the new default branch so don't touch the main branch!)
## 0. For general Platform usage, just run the frontend and node backend server (Do not run the ai servers --> these are excplicitly for interview simulation (Won't run for now so ignore!))
## 1. Prerequisites
* Node.js (v18+)
* Python (v3.10+)
* Anaconda / Miniconda
* Docker Desktop

## 2. Secrets (.env)
1. `backend-node/`: Copy `.env.example` -> rename to `.env`. Paste corresponding env file content.
2. `CareerGenie/`: Copy `.env.example` -> rename to `.env`. Add API keys and corresponding env file content.

## 3. Install Dependencies
Open terminals and run these exactly:

**Frontend & Node API:**
```bash
cd backend-node
npm install
cd ../frontend
npm install
```

**AI Main & Proctor Servers (Venv):**
```bash
cd ../backend-ai
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

**AI MER Server (Conda):**
```bash
conda env create -f environment.yml
```

## 4. Download Models (Manual)
Download the heavy `.pth`, `.onnx`, and `.tar` weights from **[(https://drive.google.com/drive/folders/1a04iZI-K1FPXZni300pi50I8MePLpgRG?usp=sharing)]**.
* Place models into `backend-ai/models/`
* Place weights into `backend-ai/weights/`
*(See exact placement in the Directory Tree at the bottom).*

## 5. Run the System
You need 6 separate terminal tabs. Run these commands to spin up the entire system:

**1. Database (Run in Root):**
```bash
docker compose up -d
```

**2. Node Backend (Run in `backend-node/`):**
```bash
npm run dev
```

**3. React Frontend (Run in `frontend/`):**
```bash
npm run dev
```

**4. AI Main Server (Run in `backend-ai/`):**
```bash
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --port 8000
```

**5. AI Proctor Server (Run in `backend-ai/`):**
```bash
.\venv\Scripts\Activate.ps1
python proctor_server.py
```

**6. AI MER Server (Run in `backend-ai/`):**
```bash
conda run -n careergenie python mer_server.py
```

## 📂 Expected Directory Tree
```text
CareerGenie/
├── .gitignore                 <-- (Hides environments and heavy media)
├── docker-compose.yml
├── README.md                  <-- (This file)
├── tree.py
├── backend-ai/
│   ├── .env                   <-- (You must create this from .env.example)
│   ├── .env.example
│   ├── environment.yml
│   ├── main.py
│   ├── mer_engine.py
│   ├── mer_server.py
│   ├── proctor_engine.py
│   ├── proctor_server.py
│   ├── requirements.txt
│   ├── start_servers.bat
│   ├── models/                <-- (DOWNLOADED Externally)
│   │   ├── best_careergenie_endtoend.pth
|   |   ├── best.pt
│   │   ├── en_US-kristin-medium.onnx
│   │   └── en_US-kristin-medium.onnx.json
│   ├── recordings/            <-- (Empty folder tracked via .gitkeep)
│   └── weights/               <-- (DOWNLOADED Externally)
│       ├── Alignment_RetinaFace.pth
│       ├── Landmark_98.pkl
│       ├── mobilenetV1X0.25_pretrain.tar
│       └── MTL_backbone.pth
├── backend-node/
│   ├── .env                   <-- (You must create this from .env.example)
│   ├── .env.example
│   ├── docker-compose.yml
│   ├── package-lock.json
│   ├── package.json
│   ├── SQL/
│   │   ├── 00_RESET_DB.sql
│   │   └── 02_add_refresh_token.sql
│   └── src/
│       ├── db.js
│       ├── server.js
│       ├── controllers/
│       │   └── practice.controller.js
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── csrf.js
│       │   ├── errorHandler.js
│       │   └── validate.js
│       ├── routes/
│       │   ├── auth.js
│       │   └── practice.js
│       ├── services/
│       │   └── practice.service.js
│       └── validators/
│           ├── auth.validators.js
│           └── practice.validators.js
└── frontend/
    ├── eslint.config.js
    ├── index.html
    ├── package-lock.json
    ├── package.json
    ├── postcss.config.mjs
    ├── tsconfig.app.json
    ├── tsconfig.json
    ├── tsconfig.node.json
    ├── vite.config.ts
    ├── public/
    │   ├── avatar.glb
    │   ├── avatar.png
    │   ├── favicon.svg
    │   ├── female-avatar.png
    │   ├── genie-character.png
    │   ├── icons.svg
    │   ├── Login.png
    │   ├── logo.png
    │   ├── logo.svg
    │   ├── model-f1.glb
    │   ├── model-f2.glb
    │   ├── model-female.glb
    │   ├── model-female2.glb
    │   ├── model-female3.glb
    │   ├── model.glb
    │   ├── model2.glb
    │   ├── model3.glb
    │   ├── neuralBackground.png
    │   ├── vite.svg
    │   ├── models/            <-- (Lightweight web UI models & shards)
    │   │   ├── face_expression_model-shard1
    │   │   ├── face_expression_model-weights_manifest.json
    │   │   ├── face_landmark_68_model-shard1
    │   │   ├── face_landmark_68_model-weights_manifest.json
    │   │   ├── tiny_face_detector_model-shard1
    │   │   └── tiny_face_detector_model-weights_manifest.json
    │   ├── previews/
    │   │   ├── Caitlin.png
    │   │   ├── David.png
    │   │   ├── kenji.png
    │   │   └── Sarah.png
    │   └── public/            <-- (Nested public assets)
    │       ├── female-avatar.png
    │       ├── genie-character.png
    │       ├── logo.png
    │       ├── neuralBackground.png
    │       ├── vite.svg
    │       ├── models/
    │       │   ├── face_expression_model-shard1
    │       │   ├── face_expression_model-weights_manifest.json
    │       │   ├── face_landmark_68_model-shard1
    │       │   ├── face_landmark_68_model-weights_manifest.json
    │       │   ├── tiny_face_detector_model-shard1
    │       │   └── tiny_face_detector_model-weights_manifest.json
    │       └── previews/
    │           ├── Caitlin.png
    │           ├── David.png
    │           ├── kenji.png
    │           └── Sarah.png
    └── src/
        ├── App.css
        ├── App.tsx
        ├── index.css
        ├── main.tsx
        ├── assets/
        │   ├── hero.png
        │   ├── react.svg
        │   └── vite.svg
        ├── components/
        │   ├── Home-page.tsx
        │   ├── Hr-dashboard.tsx
        │   ├── Login.tsx
        │   ├── mockData/
        │   │   └── data.ts
        │   └── Navbar/
        │       └── Navbar.tsx
        └── interview_module/  <-- (Core interview UI logic)
            ├── App.jsx
            ├── interview-styles.css
            ├── api/
            │   └── interviewService.js
            ├── components/
            │   ├── Avatar.jsx
            │   ├── Chat.jsx
            │   ├── Codesandbox.jsx
            │   ├── ErrorBoundary.jsx
            │   ├── Experience.jsx
            │   ├── FeedbackDisplay.jsx
            │   ├── Header.jsx
            │   ├── Message.jsx
            │   ├── Setup.jsx
            │   └── WebcamOverlay.jsx
            ├── hooks/
            │   ├── mediaHub.js
            │   ├── useChat.js
            │   └── useSpeech.js
            └── utils/
                └── visemeMapper.js
```
