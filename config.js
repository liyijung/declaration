export const CONFIG = {
    API_URL: window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost"
        ? "http://127.0.0.1:5000"
        : "https://declaration-wi4s.onrender.com",
    TOKEN_CHECK_INTERVAL: 43200000, // 12 小時 (毫秒)
    PING_INTERVAL: 600000, // 10 分鐘 (毫秒)
    ACTIVE_HOURS: { start: 0, end: 12 }, // UTC+8 活躍時段 08:00 - 20:00
};
