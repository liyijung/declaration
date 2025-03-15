from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet

# 🔑 讀取 `.env` 檔案的環境變數（確保 Flask 可以讀取密碼、密鑰等）
load_dotenv()

app = Flask(__name__)
CORS(app)  # ✅ 允許前端（如 GitHub Pages）請求後端 API

# 🔐 取得環境變數中的密鑰
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")  # JWT 加密密鑰
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")  # 密碼加密用的 Fernet 金鑰

# 🚨 **檢查 `ENCRYPTION_KEY` 是否存在，若未設定則報錯**
if not ENCRYPTION_KEY:
    raise ValueError("❌ 錯誤：ENCRYPTION_KEY 未設置！請在 `.env` 檔案內添加此金鑰！")

# 🔐 建立 Fernet 加密物件，用來加密/解密密碼
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# 🛠 **解密密碼**
# 此函式用來解密 `.env` 內儲存的密碼
def decrypt_password(encrypted_password):
    if not encrypted_password:  # 避免 `None` 傳入 Fernet，導致錯誤
        return None
    try:
        return cipher_suite.decrypt(encrypted_password.encode()).decode()
    except Exception:
        return None  # 如果解密失敗，回傳 None，避免程式崩潰

# 🔒 **取得帳號密碼（從 `.env` 讀取並解密）**
def get_users():
    return {
        "Eva": decrypt_password(os.getenv("USER_EVA", "")),  # 讀取並解密 `Eva` 的密碼
        "Admin": decrypt_password(os.getenv("USER_ADMIN", ""))  # 讀取並解密 `Admin` 的密碼
    }

# 🔍 **取得帳號的權限**
# 例如 `.env` 內 `ROLE_EVA=export`，則 `Eva` 的權限為 `export`
def get_user_role(username):
    return os.getenv(f"ROLE_{username.upper()}", "user").lower()

# 🔑 **登入 API**
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    username = data.get("username")  # 取得使用者輸入的帳號
    password = data.get("password")  # 取得使用者輸入的密碼
    
    users = get_users()  # 取得所有帳號的密碼
    stored_password = users.get(username)  # 取得該帳號的密碼

    # 🛠 **密碼驗證**
    # 🔹 我們使用 Fernet 加密，所以直接比對解密後的密碼
    # 🔹 如果密碼匹配，則發送 JWT Token
    if stored_password and password == stored_password:
        token = jwt.encode({
            "username": username,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)  # Token 12 小時後過期
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": token})  # ✅ 回傳 Token，讓前端存起來

    return jsonify({"message": "登入失敗"}), 401  # ❌ 錯誤：帳號或密碼錯誤

# 🔍 **驗證 Token API（確保使用者登入狀態）**
@app.route('/verify', methods=['POST'])
def verify():
    auth_header = request.headers.get("Authorization")  # ✅ 從 Header 取得 Token
    if not auth_header or not auth_header.startswith("Bearer "):
        return jsonify({"valid": False, "message": "缺少 Token"}), 401

    token = auth_header.split(" ")[1]  # 🔹 從 `Bearer <TOKEN>` 提取 Token
    try:
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"], options={"require": ["exp"]})
        return jsonify({"valid": True, "username": decoded["username"], "role": get_user_role(decoded["username"])})
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

        # 🔄 **產生新的 Token，延長 12 小時**
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
    return jsonify({"message": "登出成功"})  # 登出只需要刪除前端的 Token，後端不需特別處理

# ✅ **啟動 Flask 伺服器**
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))  # 🛠️ Render 會提供 `PORT`，本機則用 `5000`
    app.run(debug=True, host='0.0.0.0', port=port)
