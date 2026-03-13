export const CONFIG = {
    API_URL: "", // 稍後由 detectAPI() 動態設定
    TOKEN_CHECK_INTERVAL: 43200000, // 12 小時 (毫秒)
    PING_INTERVAL: 600000,         // 10 分鐘 (毫秒)
    ACTIVE_HOURS: { start: 0, end: 24 }, // 活躍時段 00:00 - 23:59

    AUTH_ENABLED: true   // ⭐ true = 正常登入 / false = 關閉帳密驗證
};

// ✅ 主機與備援網址
const PRIMARY_API = "https://declaration-wi4s.onrender.com";         // Render
const BACKUP_API  = "https://declaration-production.up.railway.app"; // Railway

// ✅ 動態偵測可用 API
export async function detectAPI() {

    console.log("CONFIG 版本：2026-03-13-A");
    console.log("PRIMARY_API =", PRIMARY_API);
    console.log("BACKUP_API =", BACKUP_API);
    
    // 👉 本機環境
    if (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost") {
        CONFIG.API_URL = "http://127.0.0.1:5000";
        console.log("🧪 本機開發環境 ➜ 使用本地 API");
        return;
    }

    try {
        const res = await fetch(`${PRIMARY_API}/ping`, { method: "HEAD", cache: "no-store" });
        if (res.ok) {
            CONFIG.API_URL = PRIMARY_API;
            console.log("✅ 使用主機（Render）API");
            return;
        } else {
            // ✨ 即使有回應，但回應非 200，仍切到備援
            throw new Error(`Render 回應錯誤碼: ${res.status}`);
        }
    } catch (e) {
        CONFIG.API_URL = BACKUP_API;
        console.warn("⚠️ 使用備援（Railway）API，原因：", e.message);
    }
}


