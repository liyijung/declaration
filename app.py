from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# 讀取 `.env` 變數
load_dotenv()

app = Flask(__name__)
CORS(app)  # ✅ 允許前端（如 GitHub Pages）請求後端 API

# 🔐 取得環境變數中的密鑰
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

# 🚨 **檢查 `ENCRYPTION_KEY` 是否存在，若未設定則報錯**
if not ENCRYPTION_KEY:
    raise ValueError("❌ 錯誤：ENCRYPTION_KEY 未設置！")

# 加密/解密密碼的密鑰
cipher_key = os.getenv("CIPHER_KEY", "").encode()  # 從環境變數讀取密鑰
cipher_suite = Fernet(cipher_key) if cipher_key else None  # 確保密鑰存在

def decrypt_password(encrypted_password):
    """解密密碼，解密失敗則回傳原始密文"""
    if not encrypted_password:
        return None
    try:
        return cipher_suite.decrypt(encrypted_password.encode()).decode()
    except Exception:
        return encrypted_password  # 解密失敗時，回傳原始密文

def get_users():
    """取得所有用戶的帳號與密碼，密碼解密失敗時回傳原始密文"""
    users = {}

    for key, value in os.environ.items():
        if key.startswith("USERNAME_"):
            user_index = key.split("_")[-1]
            username = value
            encrypted_password = os.getenv(f"USER_{user_index}", "")
            password = decrypt_password(encrypted_password)
            if username and password:
                users[username] = password  # 解密失敗時，密碼仍然保留
    return users

# 🔍 取得使用者權限
def get_user_role(username):
    for key, value in os.environ.items():
        if key.startswith("USERNAME_") and value == username:
            user_index = key.split("_")[-1]
            role = os.getenv(f"ROLE_{user_index}", "").lower()

            # 🔹 修正：確保 `role` 不會是空字串
            if role == "manager":
                return ["manager", "export", "import"]
            elif role == "export":
                return ["export"]
            elif role == "import":
                return ["import"]
            return []  # 🛑 確保不是 `""` 而是 `[]`
    return []

# 🔑 **登入 API**
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    users = get_users()
    stored_password = users.get(username)

    if stored_password and password == stored_password:
        roles = get_user_role(username)  # ✅ 獲取角色
        token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": token, "roles": roles})  # ✅ 一併回傳角色資訊

    return jsonify({"message": "登入失敗"}), 401

# 🔍 **驗證 Token API（確保使用者登入狀態）**
@app.route('/verify', methods=['POST'])
def verify():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"valid": False, "message": "缺少 Token"}), 401

    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})
        username = decoded["username"]

        users = get_users()
        if username not in users:  # 🛑 若帳號已刪除，則拒絕請求
            return jsonify({"valid": False, "message": "帳戶不存在"}), 401

        roles = get_user_role(username)  # ✅ 確保這裡回傳的是最新的角色資訊
        
        return jsonify({
            "valid": True,
            "username": username,
            "roles": roles if roles else []  # 🔹 確保 roles 不會是 None 或空字串
        })

    except jwt.ExpiredSignatureError:
        return jsonify({"valid": False, "message": "Token 已過期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"valid": False, "message": "無效的 Token"}), 401

# 🔄 **刷新 Token API（讓使用者保持登入狀態）**
@app.route('/refresh', methods=['POST'])
def refresh():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"valid": False, "message": "缺少 Token"}), 401

    token = auth_header.split(" ")[1]

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})
        username = decoded["username"]

        users = get_users()
        if username not in users or not users[username]:
            return jsonify({"valid": False, "message": "驗證失敗"}), 401

        # 🔄 **產生新的 Token，延長 1 小時**
        new_token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": new_token})

    except jwt.ExpiredSignatureError:
        return jsonify({"valid": False, "message": "Token 已過期，請重新登入"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"valid": False, "message": "無效的 Token"}), 401

revoked_tokens = set()  # 存放已登出的 Token

@app.route('/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        revoked_tokens.add(token)  # 🛑 把 Token 加入黑名單
    return jsonify({"message": "登出成功"})

# ✅ **啟動 Flask 伺服器**
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
