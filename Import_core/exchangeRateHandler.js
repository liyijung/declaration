let currentExchangeRates = null;
let currentExchangePeriod = null;

// 將民國年轉換為西元年
function convertRocToAd(rocDate) {
    if (rocDate.length !== 7) return '';
    const year = parseInt(rocDate.substring(0, 3), 10) + 1911;
    return year.toString() + rocDate.substring(3);
}

// 取得報關日期相關資訊
function getCustomsDeclarationDate() {
    const fileNo = document.getElementById('ACCEPTANCE_DATE').value.replace(/\//g, '');
    if (!fileNo || fileNo.length < 7) {
        const today = new Date();
        const y = today.getFullYear() - 1911;
        const m = String(today.getMonth() + 1).padStart(2, '0');
        const d = String(today.getDate()).padStart(2, '0');
        return { Fymd: `${y}${m}${d}`, yearPart: y.toString().substring(1, 3), CustomsDeclarationDate: `${y}/${m}/${d}` };
    }
    const year = fileNo.substring(0, 3);
    const month = fileNo.substring(3, 5);
    const day = fileNo.substring(5, 7);
    return {
        Fymd: year + month + day,
        yearPart: year.substring(1),
        CustomsDeclarationDate: `${year}/${month}/${day}`
    };
}

// 依據報關日期取得符合旬資料
async function getMatchedExchangePeriod() {
    const response = await fetch('gc331_current.json');
    if (!response.ok) throw new Error('無法讀取 gc331_current.json');

    const data = await response.json();
    const { Fymd } = getCustomsDeclarationDate();
    const fullDate = convertRocToAd(Fymd);

    for (const item of data.data) {
        if (fullDate >= item.start && fullDate <= item.end) return item;
    }

    throw new Error(`❌ 查無符合日期區間，西元=${fullDate}`);
}

// 初始化並快取目前的匯率與旬區間
async function initExchangeRateData() {
    try {
        const matched = await getMatchedExchangePeriod();
        currentExchangePeriod = {
            startDate: (parseInt(matched.start.substring(0, 4), 10) - 1911).toString() + matched.start.substring(4),
            endDate: (parseInt(matched.end.substring(0, 4), 10) - 1911).toString() + matched.end.substring(4)
        };
        currentExchangeRates = {};
        matched.items.forEach(item => {
            currentExchangeRates[item.code] = {
                buyValue: item.buyValue,
                sellValue: item.sellValue
            };
        });
    } catch (err) {
        console.error("初始化匯率資料失敗：", err.message);
        currentExchangeRates = {};
        currentExchangePeriod = { startDate: '0000000', endDate: '9999999' };
    }
}

// 匯率查詢主程式（依幣別找匯率）
async function lookupExchangeRate() {
    const currencyCode = document.getElementById("CURRENCY").value.trim().toUpperCase();
    const exchangeRateInput = document.getElementById("exchange-rate");
    const usdExchangeRateInput = document.getElementById("usd-exchange-rate");
    const errorSpan = document.getElementById("currency-error");

    if (currencyCode.length < 3) {
        exchangeRateInput.value = '';
        errorSpan.style.display = "none";
        return;
    }

    const { Fymd } = getCustomsDeclarationDate();
    if (!currentExchangeRates || !currentExchangePeriod) await initExchangeRateData();
    const { startDate, endDate } = currentExchangePeriod;

    usdExchangeRateInput.value = currentExchangeRates["USD"]?.sellValue || '';

    if (currentExchangeRates[currencyCode] && Fymd >= startDate && Fymd <= endDate) {
        exchangeRateInput.value = currentExchangeRates[currencyCode].sellValue;
    } else {
        exchangeRateInput.value = '';
    }
}

// 幣別驗證（input 時檢查）
document.getElementById("CURRENCY")?.addEventListener("input", function () {
    const validCurrencies = [
        "ARS", "AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "DKK", "EUR", "GBP",
        "HKD", "IDR", "ILS", "INR", "JPY", "KRW", "MYR", "NOK", "NZD", "PEN",
        "PHP", "PLN", "SEK", "SGD", "THB", "TWD", "USD", "ZAR", ""
    ];
    const input = this.value.toUpperCase();
    const errorElement = document.getElementById("currency-error");
    if (errorElement) {
        errorElement.style.display = validCurrencies.includes(input) ? "none" : "inline";
    }
});

// 📌 事件：報關日期變動重新查一次匯率資料
document.getElementById("ACCEPTANCE_DATE")?.addEventListener("blur", async () => {
    await initExchangeRateData();
    lookupExchangeRate(); // 可立即反映匯率
});

// 📌 事件：幣別輸入就查幣別匯率（不重查資料）
document.getElementById("CURRENCY")?.addEventListener("input", lookupExchangeRate);

// 計算運費並顯示結果
async function calculateFreight() {
    const currency = document.getElementById('CURRENCY').value.trim().toUpperCase();
    const exchangeRateInput = document.getElementById("exchange-rate");
    const weight = parseFloat(document.getElementById('DCL_GW').value);

    if (!currency && !weight ) {
        alert(`請先填入 "報單幣別" 及 "總毛重"`);
        return;
    } else if (!currency) {
        alert(`請先填入 "報單幣別"`);
        return;
    } else if (!weight) {
        alert(`請先填入 "總毛重"`);
        return;
    }

    if (currency && (!exchangeRateInput || !exchangeRateInput.value.trim())) {
        const { CustomsDeclarationDate } = getCustomsDeclarationDate();
        alert(`報關日期：${CustomsDeclarationDate}\n無此旬 ${currency} 匯率，無法計算！`);
        return;
    }
    
    const termsSales = document.getElementById('TERMS_SALES').value.toUpperCase();
    if (termsSales === 'EXW') {
        calculateAdditional(); // 直接跳出應加費用彈窗邏輯
        return; // 不執行後續運費計算
    }

    await initExchangeRateData(); // 確保資料已存在
    const exchangeRates = currentExchangeRates;

    if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
        return;
    }

    const usdRate = exchangeRates["USD"]?.sellValue;
    const currencyRate = exchangeRates[currency]?.sellValue;

    if (!usdRate || !currencyRate) {
        return;
    }

    if (!isNaN(weight)) {
        const roundedWeight = Math.round(weight); // 先四捨五入
        const adjustedWeight = roundedWeight < 5 ? 5 : roundedWeight; // 若小於5則以5計
        const freight = (adjustedWeight * 1 * usdRate) / currencyRate;
        const decimalPlaces = currency === "TWD" ? 0 : 2;
        document.getElementById('FRT_AMT').value = new Decimal(freight).toFixed(decimalPlaces);
        adjustFreightAndInsurance();
    }
}

// 計算保險費並顯示結果
async function calculateInsurance() {
    const currency = document.getElementById('CURRENCY').value.trim().toUpperCase();
    const exchangeRateInput = document.getElementById("exchange-rate");
    const totalAmount = parseFloat(document.getElementById('CAL_IP_TOT_ITEM_AMT').value);

    if (!currency && !totalAmount ) {
        alert(`請先填入 "報單幣別" 及 "總金額"`);
        return;
    } else if (!currency) {
        alert(`請先填入 "報單幣別"`);
        return;
    } else if (!totalAmount) {
        alert(`請先填入 "總金額"`);
        return;
    }

    if (currency && (!exchangeRateInput || !exchangeRateInput.value.trim())) {
        const { CustomsDeclarationDate } = getCustomsDeclarationDate();
        alert(`報關日期：${CustomsDeclarationDate}\n無此旬 ${currency} 匯率，無法計算！`);
        return;
    }

    await initExchangeRateData();
    const exchangeRates = currentExchangeRates;

    const currencyRate = exchangeRates[currency]?.sellValue;
    if (!currencyRate) {
        return;
    }

    if (!isNaN(totalAmount)) {
        let insurance = totalAmount * 0.0011;
        const usdRate = parseFloat(document.getElementById('usd-exchange-rate').value);
        const minimumUSD = 15;
        const minimumInsurance = (minimumUSD * usdRate) / currencyRate; // 換算成當地幣別的最低保費
        if (insurance < minimumInsurance) {
            insurance = minimumInsurance;
        }
        const decimalPlaces = currency === "TWD" ? 0 : 2;
        document.getElementById('INS_AMT').value = new Decimal(insurance).toFixed(decimalPlaces);
        adjustFreightAndInsurance();
    }
}

// 根據 TERMS_SALES 進一步判斷運費和保險費計算後是否超過總金額
function adjustFreightAndInsurance() {
    const termsSales = document.getElementById('TERMS_SALES').value.toUpperCase();
    const totalAmount = parseFloat(document.getElementById('CAL_IP_TOT_ITEM_AMT').value);

    let freight = parseFloat(document.getElementById('FRT_AMT').value);
    let insurance = parseFloat(document.getElementById('INS_AMT').value);
    
    if (termsSales === "CFR" && freight > totalAmount) {
        showIziWarningOnce("運費金額計算後超過總金額");
    } else if (termsSales === "C&I" && insurance > totalAmount) {
        showIziWarningOnce("保險費金額計算後超過總金額");
    } else if (termsSales === "CIF" && (freight + insurance) > totalAmount) {
        showIziWarningOnce("運費和保險費金額計算後超過總金額");
    }

    document.getElementById('FRT_AMT').value = (freight != null && freight !== '' && !isNaN(freight)) ? Number(freight).toFixed(2) : '';
    document.getElementById('INS_AMT').value = (insurance != null && insurance !== '' && !isNaN(insurance)) ? Number(insurance).toFixed(2) : '';
}

const shownIziMessages = new Set(); // 用來記錄已顯示的提示內容

function showIziWarningOnce(message) {
    if (shownIziMessages.has(message)) return;

    shownIziMessages.add(message);

    iziToast.warning({
        title: '注意',
        message: message,
        timeout: 5000,
        position: 'center',
        backgroundColor: '#ffeb3b',
        onClosed: () => {
            shownIziMessages.delete(message); // 關閉後移除，允許再次顯示
        }
    });
}

['change', 'blur'].forEach(eventType => {
    document.getElementById('TERMS_SALES').addEventListener(eventType, adjustFreightAndInsurance);
});

// 計算應加費用並顯示結果
async function calculateAdditional() {
    const currency = document.getElementById('CURRENCY').value.trim().toUpperCase();
    const exchangeRateInput = document.getElementById("exchange-rate");

    if (!currency) {
        alert(`請先填入"報單幣別"`);
        return;
    }

    if (currency && (!exchangeRateInput || !exchangeRateInput.value.trim())) {
        const { CustomsDeclarationDate } = getCustomsDeclarationDate();
        alert(`報關日期：${CustomsDeclarationDate}\n無此旬 ${currency} 匯率，無法計算！`);
        return;
    }
    
    const termsSales = document.getElementById('TERMS_SALES').value.toUpperCase().trim();

    if (!termsSales) {
        alert(`請先填入"貿易條件"`);
        return;
    }
    
    if (termsSales !== 'EXW') {
        alert("貿易條件非 EXW");
        return;
    }

    // 顯示彈窗
    const modal = document.getElementById('additional-modal');
    modal.style.display = 'block';

    // 延遲一點時間聚焦，確保畫面已顯示
    setTimeout(() => {
        document.getElementById('additional-currency').focus();
    }, 10);
}

function closeAdditionalModal() {
    document.getElementById('additional-modal').style.display = 'none';
}

async function submitAdditional() {
    const sourceCurrency = document.getElementById('additional-currency').value.toUpperCase();
    const amount = parseFloat(document.getElementById('additional-amount').value);
    const currency = document.getElementById('CURRENCY').value.toUpperCase(); // 目標幣別
    const decimalPlaces = currency === "TWD" ? 0 : 2;

    if (!sourceCurrency) {
        alert("請輸入運單幣別");
        return;
    }

    if (isNaN(amount)) {
        alert("請輸入正確金額");
        return;
    }

    await initExchangeRateData(); // ✅ 確保使用最新的快取資料

    if (!currentExchangeRates || !currentExchangeRates["USD"]) {
        alert("無法獲取美金匯率");
        return;
    }

    const usdRate = parseFloat(currentExchangeRates["USD"].sellValue);
    const sourceRate = parseFloat(currentExchangeRates[sourceCurrency]?.sellValue);
    const currencyRate = parseFloat(currentExchangeRates[currency]?.sellValue);

    if (!sourceRate) {
        alert(`無法找到 ${sourceCurrency} 的匯率`);
        return;
    }
    if (!currencyRate) {
        alert(`無法找到 ${currency} 的匯率`);
        return;
    }

    // Step1: 來源幣別 ➜ USD
    const usdAmount = (amount * sourceRate) / usdRate;

    // Step2: USD ➜ 目標幣別
    const convertedAmount = (usdAmount * usdRate) / currencyRate;

    // Step3: 分配金額
    const freight = convertedAmount * 0.7;
    const additional = convertedAmount * 0.3;

    // 寫入欄位
    document.getElementById('FRT_AMT').value = new Decimal(freight).toFixed(decimalPlaces);
    document.getElementById('ADD_AMT').value = new Decimal(additional).toFixed(decimalPlaces);

    adjustFreightAndInsurance();
    closeAdditionalModal();
}

document.addEventListener('DOMContentLoaded', function () {
    // 幣別輸入轉大寫
    document.getElementById('additional-currency').addEventListener('input', function () {
        this.value = this.value.toUpperCase();
    });

    // ESC 鍵關閉彈窗
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('additional-modal');
            if (modal.style.display === 'block') {
                closeAdditionalModal();
            }
        }
    });

    // 初始化拖曳功能
    makeModalDraggable('additional-modal', 'additional-modal-header');
});

// Tab 鍵在彈跳框內循環
document.addEventListener('keydown', function (e) {
    const modal = document.getElementById('additional-modal');
    if (modal.style.display === 'block' && e.key === 'Tab') {
        const focusableElements = modal.querySelectorAll('input, button');
        const focusArray = Array.from(focusableElements).filter(el => !el.disabled && el.offsetParent !== null);

        if (focusArray.length === 0) return;

        const first = focusArray[0];
        const last = focusArray[focusArray.length - 1];
        const active = document.activeElement;

        if (!e.shiftKey && active === last) {
            e.preventDefault();
            first.focus();
        } else if (e.shiftKey && active === first) {
            e.preventDefault();
            last.focus();
        }
    }
});

// 幣別異動 => 清空 運費、保險費、應加費用
document.getElementById('CURRENCY').addEventListener('input', function () {
    clearFreightInsuranceAdditional();
});

// 總毛重異動 => 清空 運費
document.getElementById('DCL_GW').addEventListener('input', function () {
    clearFreight();
    clearInsurance();
});

// 總金額異動 => 清空 保險費
document.getElementById('CAL_IP_TOT_ITEM_AMT').addEventListener('input', function () {
    clearFreight();
    clearInsurance();
});

// 清空運費、保險費、應加費用
function clearFreightInsuranceAdditional() {
    document.getElementById('FRT_AMT').value = '';
    document.getElementById('INS_AMT').value = '';
    document.getElementById('ADD_AMT').value = '';
}

// 清空運費
function clearFreight() {
    document.getElementById('FRT_AMT').value = '';
}

// 清空保險費
function clearInsurance() {
    document.getElementById('INS_AMT').value = '';
}

// 應加費用彈跳視窗拖曳邏輯
function makeModalDraggable(modalId, handleId) {
    const modal = document.getElementById(modalId);
    const handle = document.getElementById(handleId);

    let offsetX = 0, offsetY = 0, isDragging = false;

    handle.onmousedown = function (e) {
        // 取消 transform 並實際定位
        if (modal.style.transform) {
            const rect = modal.getBoundingClientRect();
            modal.style.left = `${rect.left}px`;
            modal.style.top = `${rect.top}px`;
            modal.style.transform = '';
        }

        isDragging = true;
        offsetX = e.clientX - modal.offsetLeft;
        offsetY = e.clientY - modal.offsetTop;

        // ✅ 禁止選取背景內容
        document.body.style.userSelect = 'none';

        document.onmousemove = dragMouseMove;
        document.onmouseup = stopDragging;
    };

    function dragMouseMove(e) {
        if (!isDragging) return;
        modal.style.left = `${e.clientX - offsetX}px`;
        modal.style.top = `${e.clientY - offsetY}px`;
    }

    function stopDragging() {
        isDragging = false;
        document.onmousemove = null;
        document.onmouseup = null;

        // ✅ 還原選取功能
        document.body.style.userSelect = '';
    }
}
