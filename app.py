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

# 🔐 建立 Fernet 加密物件
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# 🛠 **解密密碼**
def decrypt_password(encrypted_password):
    if not encrypted_password:  # 避免 `None` 傳入 Fernet，導致錯誤
        return None
    try:
        return cipher_suite.decrypt(encrypted_password.encode()).decode()
    except Exception:
        return None  # 如果解密失敗，回傳 None，避免程式崩潰

# 🔒 取得帳號密碼
def get_users():
    users = {}

    for key, value in os.environ.items():
        if key.startswith("USERNAME_"):
            user_index = key.split("_")[-1]
            username = value
            password = decrypt_password(os.getenv(f"USER_{user_index}", ""))
            if username and password:
                users[username] = password
    return users

# 🔍 取得使用者權限
def get_user_role(username):
    for key, value in os.environ.items():
        if key.startswith("USERNAME_") and value == username:
            user_index = key.split("_")[-1]
            role = os.getenv(f"ROLE_{user_index}", "").lower()
            if role == "manager":
                return ["manager", "export", "import"]
            return [role] if role else []
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
        token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": token})

    return jsonify({"message": "登入失敗"}), 401

# 🔍 **驗證 Token API（確保使用者登入狀態）**
@app.route('/verify', methods=['POST'])
def verify():
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"valid": False, "message": "缺少 Token"}), 401

    token = auth_header.split(" ")[1]

    if token in revoked_tokens:  # 🛑 若 Token 在黑名單，則拒絕請求
        return jsonify({"valid": False, "message": "Token 已失效"}), 401

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})
        username = decoded["username"]

        users = get_users()
        if username not in users:  # 🛑 檢查使用者是否已刪除
            return jsonify({"valid": False, "message": "帳戶不存在"}), 401

        return jsonify({"valid": True, "username": username})
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
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=1)
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
