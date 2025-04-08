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
    const fileNo = document.getElementById('FILE_NO').value;
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

    usdExchangeRateInput.value = currentExchangeRates["USD"]?.buyValue || '';

    if (currentExchangeRates[currencyCode] && Fymd >= startDate && Fymd <= endDate) {
        exchangeRateInput.value = currentExchangeRates[currencyCode].buyValue;
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
document.getElementById("FILE_NO")?.addEventListener("blur", async () => {
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
        alert(`請先填入「幣別」及「總毛重」`);
        return;
    } else if (!currency) {
        alert(`請先填入「幣別」`);
        return;
    } else if (!weight) {
        alert(`請先填入「總毛重」`);
        return;
    }

    if (currency && (!exchangeRateInput || !exchangeRateInput.value.trim())) {
        const { CustomsDeclarationDate } = getCustomsDeclarationDate();
        alert(`報關日期：${CustomsDeclarationDate}\n無此旬 ${currency} 匯率，無法計算！`);
        return;
    }

    await initExchangeRateData(); // 確保資料已存在
    const exchangeRates = currentExchangeRates;

    if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
        return;
    }

    const usdRate = exchangeRates["USD"]?.buyValue;
    const currencyRate = exchangeRates[currency]?.buyValue;

    if (!usdRate || !currencyRate) {
        return;
    }

    if (!isNaN(weight)) {
        const freight = (weight * 3 * usdRate) / currencyRate;
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
        alert(`請先填入「幣別」及「總金額」`);
        return;
    } else if (!currency) {
        alert(`請先填入「幣別」`);
        return;
    } else if (!totalAmount) {
        alert(`請先填入「總金額」`);
        return;
    }

    if (currency && (!exchangeRateInput || !exchangeRateInput.value.trim())) {
        const { CustomsDeclarationDate } = getCustomsDeclarationDate();
        alert(`報關日期：${CustomsDeclarationDate}\n無此旬 ${currency} 匯率，無法計算！`);
        return;
    }

    await initExchangeRateData();
    const exchangeRates = currentExchangeRates;

    const currencyRate = exchangeRates[currency]?.buyValue;
    if (!currencyRate) {
        return;
    }

    if (!isNaN(totalAmount)) {
        let insurance = totalAmount * 0.0011;
        const minimumInsurance = 450 / currencyRate;
        if (insurance < minimumInsurance) {
            insurance = minimumInsurance;
        }
        const decimalPlaces = currency === "TWD" ? 0 : 2;
        document.getElementById('INS_AMT').value = new Decimal(insurance).toFixed(decimalPlaces);
        adjustFreightAndInsurance();
    }
}

// 根據 TERMS_SALES 進一步判斷並調整運費和保險費
function adjustFreightAndInsurance() {
    const termsSales = document.getElementById('TERMS_SALES').value.toUpperCase();
    const totalAmount = parseFloat(document.getElementById('CAL_IP_TOT_ITEM_AMT').value);

    let freight = parseFloat(document.getElementById('FRT_AMT').value);
    let insurance = parseFloat(document.getElementById('INS_AMT').value);

    if (termsSales === "EXW" || termsSales === "FOB") {
        freight = '';
        insurance = '';
    } else if (termsSales === "CFR" && freight > totalAmount) {
        freight = totalAmount / 2;
        showIziWarningOnce("運費金額計算後超過總金額，以 總金額÷2 做為運費");
    } else if (termsSales === "C&I" && insurance > totalAmount) {
        insurance = totalAmount / 2;
        showIziWarningOnce("保險費金額計算後超過總金額，以 總金額÷2 做為保險費");
    } else if (termsSales === "CIF" && (freight + insurance) > totalAmount) {
        freight = totalAmount / 4;
        insurance = totalAmount / 4;
        showIziWarningOnce("運費和保險費金額計算後超過總金額，以 總金額÷2 做為運保費");
    }

    document.getElementById('FRT_AMT').value = (freight != null && freight !== '' && !isNaN(freight)) ? Number(freight).toFixed(2) : '';
    document.getElementById('INS_AMT').value = (insurance != null && insurance !== '' && !isNaN(insurance)) ? Number(insurance).toFixed(2) : '';
}

const shownIziMessages = new Set(); // 用來記錄已顯示的提示內容

function showIziWarningOnce(message) {
    if (shownIziMessages.has(message)) return;

    shownIziMessages.add(message);

    iziToast.warning({
        title: '說明',
        message: message,
        timeout: 5000,
        position: 'center',
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
        alert(`請先填入「幣別」`);
        return;
    }

    if (currency && (!exchangeRateInput || !exchangeRateInput.value.trim())) {
        const { CustomsDeclarationDate } = getCustomsDeclarationDate();
        alert(`報關日期：${CustomsDeclarationDate}\n無此旬 ${currency} 匯率，無法計算！`);
        return;
    }

    await initExchangeRateData();
    const exchangeRates = currentExchangeRates;
    const currencyRate = exchangeRates[currency]?.buyValue;

    if (!currencyRate) {
        document.getElementById('ADD_AMT').value = "無法獲取該幣別匯率";
        return;
    }

    const additionalFee = 500 / currencyRate;
    const decimalPlaces = currency === "TWD" ? 0 : 2;
    document.getElementById('ADD_AMT').value = new Decimal(additionalFee).toFixed(decimalPlaces);
}

// 幣別異動 => 清空 運費、保險費、應加費用
document.getElementById('CURRENCY').addEventListener('input', function () {
    clearFreightInsuranceAdditional();
});

// 總毛重異動 => 清空 運費、保險費
document.getElementById('DCL_GW').addEventListener('input', function () {
    clearFreight();
    clearInsurance();
});

// 總金額異動 => 清空 運費、保險費
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
