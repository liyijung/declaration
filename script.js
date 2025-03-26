import { CONFIG } from './config.js';

// 設定時區：台灣時間 (UTC+8)
function getTaiwanTime() {
    const formatter = new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hour = parseInt(parts.find(p => p.type === 'hour').value, 10);
    const minute = parseInt(parts.find(p => p.type === 'minute').value, 10);
    return { hour, minute };
}
    
function isWithinActiveHours() {
    const { hour, minute } = getTaiwanTime();
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const isActive = hour >= CONFIG.ACTIVE_HOURS.start && hour < CONFIG.ACTIVE_HOURS.end;
    console.log(`⏰ 台灣時間 ${timeStr} → ${isActive ? '活躍時段 ✅' : '非活躍時段 ⏳'}`);
    return isActive;
}

// ✅ 封裝 ping 功能
function pingServer() {
    if (isWithinActiveHours()) {
        fetch(`${CONFIG.API_URL}/ping`, { method: 'HEAD' })
            .then(response => {
                console.log(`✅ PING 回應狀態碼: ${response.status}`);
            })
            .catch(error => console.error("❌ 無法連線到伺服器:", error));
    } else {
        console.log("⏳ 非活躍時段，不發送 ping");
    }
}

// ✅ 頁面載入時立即執行一次
pingServer();

// ✅ 每 10 分鐘檢查一次
setInterval(pingServer, CONFIG.PING_INTERVAL);

document.addEventListener("DOMContentLoaded", function () {
    checkLoginStatus();

    // 🛠️ 登入表單送出
    document.getElementById("login-form").addEventListener("submit", async function (event) {
        event.preventDefault();
        const userid = document.getElementById("userid").value;
        const password = document.getElementById("password").value;

        const response = await fetch(`${CONFIG.API_URL}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include", // ✅ 跨域必加
            body: JSON.stringify({ userid, password })
        });

        const data = await response.json();
        if (response.ok && data.token) {
            // 🔹 存入 LocalStorage，確保重整後仍可顯示
            localStorage.setItem("token", data.token);
            localStorage.setItem("loggedInUser", userid); // 存入使用者名稱
            localStorage.setItem("username", data.username);
            localStorage.setItem("userRoles", JSON.stringify(data.roles || [])); // 存入角色權限
            localStorage.setItem("Maker", data.username);
            
            // 🔹 存入 SessionStorage，避免返回上一頁後丟失
            sessionStorage.setItem("loggedInUser", userid);
            sessionStorage.setItem("username", data.username);
            sessionStorage.setItem("userRoles", JSON.stringify(data.roles || []));
            sessionStorage.setItem("Maker", data.username); // ✅ 存入 Maker

            showUserInfo(data.username);
            closeLoginModal(); // ✅ 關閉彈跳框
        } else {
            alert("登入失敗，請檢查帳號密碼");
        }
    });

    // 🔓 登出功能
    document.getElementById("logout-btn").addEventListener("click", function () {
        const token = localStorage.getItem("token");

        // 如果有登入才呼叫 logout API
        if (token) {
            fetch(`${CONFIG.API_URL}/logout`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                credentials: "include" // ✅ 跨域必加
            }).then(res => res.json())
            .then(data => console.log(data.message || "已登出"));
        }

        // 不論是否成功都清除本地資訊
        localStorage.removeItem("token");
        localStorage.removeItem("loggedInUser");
        localStorage.removeItem("userRoles");
        sessionStorage.clear();
        window.location.reload();
    });
});

function closeLoginModal() {
    let loginModal = bootstrap.Modal.getInstance(document.getElementById('loginModal'));
    if (loginModal) {
        loginModal.hide(); // ✅ 隱藏登入彈跳框
    }

    // ✅ 修正背景變暗的問題
    document.body.classList.remove("modal-open"); // 移除 modal-open
    let backdrop = document.querySelector(".modal-backdrop");
    if (backdrop) {
        backdrop.remove(); // 移除黑色遮罩
    }
}

// 🔍 檢查登入狀態
function checkLoginStatus() {
    const token = localStorage.getItem("token");
    if (!token) return;

    // 從 LocalStorage 讀取已登入的使用者名稱
    let username = localStorage.getItem("loggedInUser") || "";

    // 從 LocalStorage 讀取角色權限
    let roles = JSON.parse(localStorage.getItem("userRoles") || "[]");

    // 如果 sessionStorage 沒有資料，則從 localStorage 補充
    if (!sessionStorage.getItem("loggedInUser") && username) {
        sessionStorage.setItem("loggedInUser", username);
    }
    if (!sessionStorage.getItem("userRoles") && roles.length > 0) {
        sessionStorage.setItem("userRoles", JSON.stringify(roles));
    }

    showUserInfo(username);

    // 超時計時器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 秒超時

    fetch(`${CONFIG.API_URL}/verify`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        credentials: "include", // ✅ 跨域必加
        signal: controller.signal
    })
    .then(res => res.json())
    .then(data => {
        clearTimeout(timeoutId); // 若 API 回應正常，清除超時計時器
        if (data.valid) {
            sessionStorage.setItem("loggedInUser", data.userid);
            sessionStorage.setItem("userRoles", JSON.stringify(data.roles || []));
            showUserInfo(data.username);
        } else {
            handleSessionTimeout(); // 若 token 無效則登出
        }
    })
    .catch(error => {
        clearTimeout(timeoutId);
        if (error.name === "AbortError") {
            console.warn("⏱ API 逾時，自動登出");
        } else {
            console.error("❌ 發生錯誤：", error);
        }
        handleSessionTimeout();
    });
}

// 🛠️ 顯示登入後資訊
function showUserInfo(username) {
    if (!username) {
        username = localStorage.getItem("loggedInUser") || "使用者";
    }

    if (username !== "使用者") {
        document.getElementById("login-btn").classList.add("d-none"); // 隱藏登入按鈕
        document.getElementById("user-info").classList.remove("d-none"); // 顯示使用者資訊
        document.getElementById("user-name").textContent = username;
    } else {
        document.getElementById("login-btn").classList.remove("d-none");
        document.getElementById("user-info").classList.add("d-none");
    }
}

// 🔐 驗證點擊報單權限
window.checkLogin = function(event, page) {
    const token = localStorage.getItem("token");
    if (!token) {
        event.preventDefault();
        alert("請先登入！");
        return;
    }

    const userRoles = JSON.parse(sessionStorage.getItem("userRoles") || "[]");

    if (page.includes("Export") && !userRoles.includes("export")) {
        event.preventDefault();
        alert("❌ 無權限進入【出口報單】");
        return;
    }

    if (page.includes("Import") && !userRoles.includes("import")) {
        event.preventDefault();
        alert("❌ 無權限進入【進口報單】");
        return;
    }

    window.location.href = page;
};

// 🔍 登入逾時處理
window.handleSessionTimeout = function(message = "登入逾時，請重新登入！") {
    alert(message);
    localStorage.removeItem("token"); // 清除 token
    localStorage.removeItem("loggedInUser");
    localStorage.removeItem("userRoles");
    sessionStorage.clear(); // 清除 session
    window.location.reload();
    window.location.href = "https://liyijung.github.io/declaration/"; // 重新導向到登入頁
};

// 公告視窗
setTimeout(() => {
    document.getElementById('announcement-box').style.bottom = '20px';
}, 1000);

document.getElementById('close-btn').addEventListener('click', () => {
    document.getElementById('announcement-box').style.bottom = '-100%';
});
