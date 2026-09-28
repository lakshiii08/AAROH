import uvicorn
import os

if __name__ == "__main__":
    host = os.getenv("API_HOST", "0.0.0.0")
    port = int(os.getenv("API_PORT", 8000))
    print(f"Starting AAROH API Server on http://{host}:{port}")
    uvicorn.run("api.main:app", host=host, port=port, reload=True)
