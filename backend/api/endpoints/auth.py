import json
import os
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

# Модель даних, які приходять з фронта
class LoginRequest(BaseModel):
    username: str
    password: str

# Шлях до файлу (оскільки docker запускає main.py з кореня backend, файл шукаємо там же)
USERS_FILE = "app/users.json"

@router.post("/login")
async def login_user(creds: LoginRequest):
    # 1. Перевіряємо чи існує файл
    if not os.path.exists(USERS_FILE):
        print(f"ERROR: File {USERS_FILE} not found!") # Лог для дебагу в докері
        raise HTTPException(status_code=500, detail="User DB not initialized")

    # 2. Читаємо файл
    try:
        with open(USERS_FILE, "r") as f:
            users_db = json.load(f)
    except Exception as e:
        print(f"ERROR reading json: {e}")
        raise HTTPException(status_code=500, detail="User DB corrupted")

    # 3. Звіряємо паролі (Пряме порівняння, як ти і хотів для простоти)
    if creds.username in users_db and users_db[creds.username] == creds.password:
        return {
            "success": True,
            "user": {
                "username": creds.username,
                "role": "admin" # Поки що всім даємо адміна, бо це внутрішній тул
            }
        }
    
    # 4. Якщо не співпало
    raise HTTPException(status_code=401, detail="Invalid credentials")