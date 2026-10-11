import os
import sys

# 1. Establish absolute path to backend directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")

# 2. Switch current working directory into backend so Python never confuses
# Next.js's frontend "app/" directory with FastAPI's "backend/app/"
os.chdir(BACKEND_DIR)

# 3. Configure sys.path and PYTHONPATH environment variable for child processes
if BASE_DIR in sys.path:
    sys.path.remove(BASE_DIR)
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

os.environ["PYTHONPATH"] = BACKEND_DIR

import uvicorn

if __name__ == "__main__":
    print(f"[*] Starting AAROH FastAPI Backend from: {BACKEND_DIR}")
    print("[*] Target URL: http://127.0.0.1:8000")
    print("[*] Swagger API Docs: http://127.0.0.1:8000/docs")
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=False)
