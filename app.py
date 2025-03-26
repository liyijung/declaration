from flask import Flask, request, jsonify
from flask_cors import CORS
import jwt
import datetime
import os
from dotenv import load_dotenv
from cryptography.fernet import Fernet
import base64

# 讀取 `.env` 變數
load_dotenv()

app = Flask(__name__)

# ✅ 允許前端（GitHub Pages）請求後端 API
CORS(app, origins=[
    "http://127.0.0.1:5500",
    "https://liyijung.github.io"
])

# 🔐 取得環境變數中的密鑰
SECRET_KEY = os.getenv("SECRET_KEY", "default-secret-key")
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

# 🚨 **檢查 `ENCRYPTION_KEY` 是否存在，若未設定則報錯**
if not ENCRYPTION_KEY:
    raise ValueError("❌ 錯誤：ENCRYPTION_KEY 未設置！")

# 加密/解密密碼的密鑰
cipher_key = os.getenv("CIPHER_KEY", "").encode()
cipher_suite = Fernet(cipher_key) if cipher_key else None

def decrypt_password(encrypted_password):
    """解密密碼，解密失敗則回傳原始密碼"""
    if not encrypted_password:
        return None
    try:
        # ✅ 先嘗試 Base64 轉回 bytes
        encrypted_password_bytes = base64.urlsafe_b64decode(encrypted_password.encode())  
        return cipher_suite.decrypt(encrypted_password_bytes).decode()
    except Exception:
        return encrypted_password  # 解密失敗，可能是明文密碼

def get_users():
    """取得所有用戶的帳號與密碼，允許解密失敗時回傳原密碼"""
    users = {}

    for key, value in os.environ.items():
        if key.startswith("USERID_"):
            user_index = key.split("_")[-1]
            userid = value
            encrypted_password = os.getenv(f"USER_{user_index}", "")
            password = decrypt_password(encrypted_password)
            username = os.getenv(f"USERNAME_{user_index}", "未設定")
            
            if userid and password:
                users[userid] = {
                    "password": password,
                    "username": username
                }

    return users

# 🔍 取得使用者權限
def get_user_role(userid):
    for key, value in os.environ.items():
        if key.startswith("USERID_") and value == userid:
            user_index = key.split("_")[-1]
            role = os.getenv(f"ROLE_{user_index}", "").lower()
            username = os.getenv(f"USERNAME_{user_index}", "未設定")

            # 🔹 確保 `role` 不會是空字串
            if role == "manager":
                roles = ["manager", "export", "import"]
            elif role == "export,import":
                roles = ["export", "import"]
            elif role == "export":
                roles = ["export"]
            elif role == "import":
                roles = ["import"]
            else:
                roles = []

            return roles, username
        
    return [], "未設定"

# 🔑 **登入 API**
@app.route('/login', methods=['POST'])
def login():
    data = request.json
    userid = data.get("userid")
    password = data.get("password")

    users = get_users()
    user_info = users.get(userid)

    if user_info and password == user_info["password"]:
        roles, username = get_user_role(userid)
        token = jwt.encode({
            "userid": userid,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({
            "token": token,
            "roles": roles,
            "username": username
        })

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
        userid = decoded["userid"]

        users = get_users()
        user_info = users.get(userid)

        if not user_info:
            return jsonify({"valid": False, "message": "帳戶不存在"}), 401

        roles, username = get_user_role(userid)

        return jsonify({
            "valid": True,
            "userid": userid,
            "roles": roles,
            "username": username
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
        userid = decoded["userid"]

        users = get_users()
        if userid not in users or not users[userid]:
            return jsonify({"valid": False, "message": "驗證失敗"}), 401

        # 🔄 **產生新的 Token，延長 12 小時**
        new_token = jwt.encode({
            "userid": userid,
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=12)
        }, SECRET_KEY, algorithm="HS256")

        return jsonify({"token": new_token})

    except jwt.ExpiredSignatureError:
        return jsonify({"valid": False, "message": "Token 已過期，請重新登入"}), 401
    except jwt.InvalidTokenError:
        return jsonify({"valid": False, "message": "無效的 Token"}), 401

# 🚪 **登出 API（無效化 Token）**
revoked_tokens = set()  # 存放已登出的 Token

@app.route('/logout', methods=['POST'])
def logout():
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
        revoked_tokens.add(token)  # 🛑 把 Token 加入黑名單
    return jsonify({"message": "登出成功"})

@app.route('/ping', methods=['GET'])
def ping():
    return jsonify({"message": "pong", "status": "active"}), 200

@app.route('/')
def index():
    return 'Server is awake!'
    
# ✅ **啟動 Flask 伺服器**
if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=True, host='0.0.0.0', port=port)
