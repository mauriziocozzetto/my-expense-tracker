cd backend
python3 -m venv test_venv
source test_venv/bin/activate
pip install fastapi "uvicorn[standard]" sqlmodel aiosqlite
uvicorn main:app --port 8001 > uvicorn_test.log 2>&1 &
echo $! > uvicorn_pid.txt
