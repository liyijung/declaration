async function fetchDateRange() {
    try {
        const response = await fetch('gc331_current.json');
        if (!response.ok) {
            throw new Error('無法讀取 gc331_current.json');
        }
        const data = await response.json();

        // 將西元年轉換為民國年
        function convertToTaiwanDateFormat(dateStr) {
            if (dateStr.length !== 8) {
                throw new Error("日期格式錯誤，應為 YYYYMMDD");
            }
            const year = parseInt(dateStr.substring(0, 4), 10); // 取出西元年
            const monthDay = dateStr.substring(4);              // 取出 MMDD
            const taiwanYear = year - 1911;                     // 民國年 = 西元年 - 1911
            return taiwanYear.toString() + monthDay;            // 組合民國年與 MMDD
        }

        return {
            startDate: convertToTaiwanDateFormat(data.start), // 動態讀取並轉換開始日期
            endDate: convertToTaiwanDateFormat(data.end)      // 動態讀取並轉換結束日期
        };
    } catch (error) {
        console.error('讀取日期區間時發生錯誤：', error);
        return {
            startDate: '0000000', // 默認值：民國年格式
            endDate: '9999999'
        };
    }
}

// 全域變數：快取匯率數據，避免頻繁請求
let cachedExchangeRates = null;

// 從 gc331_current.json 檔案中獲取匯率數據（使用快取）
async function fetchExchangeRates() {
    if (cachedExchangeRates) {
        return cachedExchangeRates; // 若已有快取則直接返回
    }

    try {
        const response = await fetch('gc331_current.json');
        if (!response.ok) {
            throw new Error(`HTTP 錯誤！狀態碼：${response.status}，URL：${response.url}`);
        }
        const data = await response.json();
        
        // 轉換為 { "TWD": { buyValue: "1", sellValue: "1" }, ... } 格式
        const exchangeRates = {};
        if (data.items) {
            data.items.forEach(item => {
                exchangeRates[item.code] = {
                    buyValue: item.buyValue,
                    sellValue: item.sellValue
                };
            });
        }

        cachedExchangeRates = exchangeRates; // 快取數據
        return exchangeRates;
    } catch (error) {
        console.error('獲取匯率數據時出錯:', error.message);
        return {}; // 返回空物件，避免 `null` 造成 TypeError
    }
}

// 貨幣代碼驗證邏輯
const currencyField = document.getElementById("CURRENCY");
if (currencyField) {
    currencyField.addEventListener("blur", function () {
        const validCurrencies = [
            "ARS", "AUD", "BRL", "CAD", "CHF", "CLP", "CNY", "DKK", "EUR", "GBP", 
            "HKD", "IDR", "ILS", "INR", "JPY", "KRW", "MYR", "NOK", "NZD", "PEN", 
            "PHP", "PLN", "SEK", "SGD", "THB", "TWD", "USD", "ZAR", "",
        ];
        const input = this.value.toUpperCase();
        const errorElement = document.getElementById("currency-error");

        if (errorElement) {
            if (!validCurrencies.includes(input)) {
                errorElement.style.display = "inline";
            } else {
                errorElement.style.display = "none";
            }
        }
    });
}

// 查找並更新匯率
async function lookupExchangeRate() {
    const currencyInput = document.getElementById("CURRENCY");
    const errorSpan = document.getElementById("currency-error");
    const exchangeRateInput = document.getElementById("exchange-rate"); // 匯率欄位
    const usdExchangeRateInput = document.getElementById("usd-exchange-rate"); // 美金匯率欄位

    // 取得輸入的幣別並轉換為大寫
    const currencyCode = currencyInput.value.trim().toUpperCase();

    // 只在輸入滿 3 碼時進行查找
    if (currencyCode.length < 3) {
        errorSpan.style.display = "none";
        exchangeRateInput.value = ""; // 清空匯率欄位
        return;
    }

    // 獲取匯率數據
    const exchangeRates = await fetchExchangeRates();

    // 當旬匯率日期區間
    var { Fymd, yearPart, CustomsDeclarationDate } = getCustomsDeclarationDate();
    const { startDate, endDate } = await fetchDateRange();

    // 先處理 USD 匯率（不論輸入什麼幣別都要顯示）
    if (exchangeRates["USD"]) {
        usdExchangeRateInput.value = exchangeRates["USD"].sellValue;
    } else {
        usdExchangeRateInput.value = "";
    }
    
    // 檢查是否存在該幣別
    if (exchangeRates[currencyCode] && (Fymd >= startDate && Fymd <= endDate)) {
        const sellValue = exchangeRates[currencyCode].sellValue;
        exchangeRateInput.value = sellValue; // 顯示賣出價
        errorSpan.style.display = "none";
    } else if (Fymd < startDate || Fymd > endDate) {
        exchangeRateInput.value = ""; // 清空匯率欄位
        errorSpan.style.display = "none";
    } else {
        exchangeRateInput.value = ""; // 清空匯率欄位
        errorSpan.style.display = "inline";
    }
}

// 取得報關日期
function getCustomsDeclarationDate() {
    var acceptanceDate = document.getElementById('ACCEPTANCE_DATE').value;

    if (!acceptanceDate || !/^\d{3}\/\d{2}\/\d{2}$/.test(acceptanceDate)) {
        // 若未填寫或格式錯誤，預設使用今日日期
        var today = new Date();
        var Tyear = today.getFullYear() - 1911;
        var Tmonth = String(today.getMonth() + 1).padStart(2, '0');
        var Tday = String(today.getDate()).padStart(2, '0');
        return {
            Fymd: Tyear + Tmonth + Tday,
            yearPart: String(Tyear).substring(1, 3),
            CustomsDeclarationDate: Tyear + '/' + Tmonth + '/' + Tday
        };
    }

    // 若填寫正確，解析民國年日期
    var [year, month, day] = acceptanceDate.split('/');
    return {
        Fymd: year + month + day,
        yearPart: year.substring(1, 3),
        CustomsDeclarationDate: acceptanceDate
    };
}

// 監聽事件
document.getElementById("ACCEPTANCE_DATE").addEventListener("blur", lookupExchangeRate);
document.getElementById("CURRENCY").addEventListener("input", lookupExchangeRate);

// 計算運費並顯示結果
function calculateFreight() {
    const currency = document.getElementById('CURRENCY').value.toUpperCase();
    const weight = parseFloat(document.getElementById('DCL_GW').value);

    fetchExchangeRates().then(exchangeRates => {
        if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
            document.getElementById('FRT_AMT').value = "無法獲取匯率數據";
            return;
        }

        const usdRate = exchangeRates["USD"]?.sellValue;
        const currencyRate = exchangeRates[currency]?.sellValue;

        if (!usdRate) {
            console.error("無法找到 USD 匯率", exchangeRates);
            document.getElementById('FRT_AMT').value = "無法獲取 USD 匯率";
            return;
        }

        if (!currencyRate) {
            console.error(`無法找到 ${currency} 匯率`, exchangeRates);
            document.getElementById('FRT_AMT').value = "無法獲取該幣別匯率";
            return;
        }

        if (!isNaN(weight)) {
            const roundedWeight = Math.round(weight); // 先四捨五入
            const adjustedWeight = roundedWeight < 5 ? 5 : roundedWeight; // 若小於5則以5計
            const freight = (adjustedWeight * 1 * usdRate) / currencyRate;
            const decimalPlaces = currency === "TWD" ? 0 : 2;
            document.getElementById('FRT_AMT').value = new Decimal(freight).toFixed(decimalPlaces);
            adjustFreightAndInsurance();
        } else {
            document.getElementById('FRT_AMT').value = "輸入無效";
        }
    });
}

// 計算保險費並顯示結果
function calculateInsurance() {
    const totalAmount = parseFloat(document.getElementById('CAL_IP_TOT_ITEM_AMT').value);
    const currency = document.getElementById('CURRENCY').value.toUpperCase();

    fetchExchangeRates().then(exchangeRates => {
        if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
            document.getElementById('INS_AMT').value = "無法獲取匯率數據";
            return;
        }

        const currencyRate = exchangeRates[currency]?.sellValue;

        if (!currencyRate) {
            console.error(`無法找到 ${currency} 匯率`, exchangeRates);
            document.getElementById('INS_AMT').value = "無法獲取該幣別匯率";
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
        } else {
            document.getElementById('INS_AMT').value = "輸入無效";
        }
    });
}

// 根據 TERMS_SALES 進一步判斷並調整運費和保險費
function adjustFreightAndInsurance() {
    const termsSales = document.getElementById('TERMS_SALES').value.toUpperCase();
    const totalAmount = parseFloat(document.getElementById('CAL_IP_TOT_ITEM_AMT').value);

    let freight = parseFloat(document.getElementById('FRT_AMT').value);
    let insurance = parseFloat(document.getElementById('INS_AMT').value);
    
    if (termsSales === "CFR" && freight > totalAmount) {
        freight = totalAmount / 2;
    } else if (termsSales === "C&I" && insurance > totalAmount) {
        insurance = totalAmount / 2;
    } else if (termsSales === "CIF" && (freight + insurance) > totalAmount) {
        freight = totalAmount / 4;
        insurance = totalAmount / 4;
    }

    document.getElementById('FRT_AMT').value = freight === '' ? '' : freight.toFixed(2);
    document.getElementById('INS_AMT').value = insurance === '' ? '' : insurance.toFixed(2);
}

// 計算應加費用並顯示結果
function calculateAdditional() {
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
    const amount = parseFloat(document.getElementById('additional-amount').value);
    const sourceCurrency = document.getElementById('additional-currency').value.toUpperCase();
    const currency = document.getElementById('CURRENCY').value.toUpperCase(); // 目標幣別
    const decimalPlaces = currency === "TWD" ? 0 : 2;

    if (isNaN(amount)) {
        alert("請輸入正確金額");
        return;
    }

    const exchangeRates = await fetchExchangeRates();

    if (!exchangeRates || !exchangeRates["USD"]) {
        alert("無法獲取美金匯率");
        return;
    }

    const usdRate = parseFloat(exchangeRates["USD"].sellValue);
    const currencyRate = parseFloat(exchangeRates[currency]?.sellValue);
    const sourceRate = parseFloat(exchangeRates[sourceCurrency]?.sellValue);

    if (!currencyRate) {
        alert(`請先填入報單幣別`);
        return;
    }
    if (!sourceRate) {
        alert(`無法找到 ${sourceCurrency} 的匯率`);
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

// 初始化拖曳功能
document.addEventListener('DOMContentLoaded', function () {
    makeModalDraggable('additional-modal', 'additional-modal-header');
});
