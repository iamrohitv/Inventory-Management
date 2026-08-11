#!/usr/bin/env python3
"""
Startup script for E-Commerce Inventory Manager
"""
import subprocess
import sys
import os
import time
import signal
import atexit

BACKEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'backend')
FRONTEND_DIR = os.path.join(os.path.dirname(__file__), '..', 'frontend')

processes = []

def cleanup():
    for p in processes:
        try:
            p.terminate()
            p.wait(timeout=5)
        except:
            try:
                p.kill()
            except:
                pass

atexit.register(cleanup)

def run_backend():
    print("Starting FastAPI backend...")
    os.chdir(BACKEND_DIR)
    p = subprocess.Popen([sys.executable, '-m', 'uvicorn', 'app.main:app', '--reload', '--host', '0.0.0.0', '--port', '8000'])
    processes.append(p)
    return p

def run_frontend():
    print("Starting frontend (Vite dev server)...")
    os.chdir(FRONTEND_DIR)
    npm = 'npm.cmd' if os.name == 'nt' else 'npm'
    p = subprocess.Popen([npm, 'run', 'dev'])
    processes.append(p)
    return p

def check_mongodb():
    print("Checking MongoDB connection...")
    try:
        import pymongo
        client = pymongo.MongoClient('mongodb://localhost:27017', serverSelectionTimeoutMS=2000)
        client.server_info()
        print("MongoDB connected successfully")
        return True
    except Exception as e:
        print(f"MongoDB connection failed: {e}")
        print("Please ensure MongoDB is running on localhost:27017")
        return False

def main():
    print("=" * 50)
    print("E-Commerce Inventory Manager - Startup")
    print("=" * 50)

    if not check_mongodb():
        sys.exit(1)

    backend_proc = run_backend()
    time.sleep(3)

    frontend_proc = run_frontend()
    time.sleep(1)

    print("\n" + "=" * 50)
    print("Services Started Successfully!")
    print("=" * 50)
    print(f"Backend API:  http://localhost:8000")
    print(f"API Docs:     http://localhost:8000/docs")
    print(f"Frontend:     http://localhost:5173")
    print(f"Health Check: http://localhost:8000/health")
    print("=" * 50)
    print("\nPress Ctrl+C to stop all services\n")

    try:
        while True:
            time.sleep(1)
            for p in processes:
                if p.poll() is not None:
                    print(f"Process {p.pid} exited unexpectedly")
                    cleanup()
                    sys.exit(1)
    except KeyboardInterrupt:
        print("\nShutting down...")
        cleanup()
        print("Done.")

if __name__ == '__main__':
    main()