from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import os
from dotenv import load_dotenv
from werkzeug.security import check_password_hash
from cryptography.fernet import Fernet


# 🔑 讀取 `.env` 配置
load_dotenv()

app = Flask(__name__)
CORS(app)  # 允許跨域請求 (允許前端從 GitHub 呼叫 Flask API)

SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")  # 環境變數內的密鑰
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")  # 加密用的密鑰 (Fernet)

# 🚨 **確保 `ENCRYPTION_KEY` 存在，否則報錯**
if not ENCRYPTION_KEY:
    raise ValueError("❌ 錯誤：ENCRYPTION_KEY 未設置！請在 `.env` 添加此金鑰！")

cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# 🔓 **解密密碼（避免 NoneType 造成錯誤）**
def decrypt_password(encrypted_password):
    if not encrypted_password:  # 避免 `None` 傳入 Fernet
        return None
    return cipher_suite.decrypt(encrypted_password.encode()).decode()

# 🔒 **讀取帳號密碼 (解密後使用)**
def get_users():
    return {
        "Eva": decrypt_password(os.getenv("USER_EVA", "")),
        "Admin": decrypt_password(os.getenv("USER_ADMIN", ""))
    }

# 🔍 **讀取帳號權限**
def get_user_role(username):
    return os.getenv(f"ROLE_{username.upper()}", "user").lower()

# 🔑 **登入 API**
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")
    password = data.get("password")
    
    users = get_users()  # 取得帳號清單
    stored_password = users.get(username)

    # 🚨 **修正 `check_password_hash()` 問題**
    # `check_password_hash()` 需要哈希密碼，但我們是加密密碼，因此直接比對
    if stored_password and password == stored_password:
        token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)  # 12 小時後過期
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": token})  # ✅ 只回傳 Token

    return jsonify({"message": "登入失敗"}), 401  # 🔒 避免暴力破解攻擊

# 🔍 **驗證 API (檢查 Token 是否有效)**
@app.route('/verify', methods=['POST'])
def verify():
    data = request.json
    token = data.get("token")

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})
        username = decoded["username"]

        users = get_users()  # 取得帳號清單
        if username not in users or not users[username]:  
            return jsonify({"valid": False, "message": "驗證失敗"}), 401

        user_role = get_user_role(username)

        return jsonify({"valid": True, "username": username, "role": user_role})
    except jwt.ExpiredSignatureError:
        return jsonify({"valid": False, "message": "Token 已過期"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"valid": False, "message": "無效的 Token"}), 401

# 🔄 **刷新 Token API**
@app.route('/refresh', methods=['POST'])
def refresh():
    data = request.json
    token = data.get("token")

    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})
        username = decoded["username"]

        users = get_users()  # 取得帳號清單
        if username not in users or not users[username]:
            return jsonify({"valid": False, "message": "驗證失敗"}), 401

        new_token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": new_token})

    except jwt.ExpiredSignatureError:
        return jsonify({"valid": False, "message": "Token 已過期，請重新登入"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"valid": False, "message": "無效的 Token"}), 401

# 🔓 **登出 API**
@app.route('/logout', methods=['POST'])
def logout():
    return jsonify({"message": "登出成功"})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))  # 🛠️ 讓 Render 使用 `PORT`
    app.run(debug=True, host='0.0.0.0', port=port)
