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

// 計算運費並顯示結果
function calculateFreight() {
    const currency = document.getElementById('CURRENCY').value.toUpperCase();
    const weight = parseFloat(document.getElementById('DCL_GW').value);

    fetchExchangeRates().then(exchangeRates => {
        if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
            document.getElementById('FRT_AMT').value = "無法獲取匯率數據";
            return;
        }

        const usdRate = exchangeRates["USD"]?.buyValue;
        const currencyRate = exchangeRates[currency]?.buyValue;

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
            const freight = (weight * 3 * usdRate) / currencyRate;
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

        const currencyRate = exchangeRates[currency]?.buyValue;

        if (!currencyRate) {
            console.error(`無法找到 ${currency} 匯率`, exchangeRates);
            document.getElementById('INS_AMT').value = "無法獲取該幣別匯率";
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

    if (termsSales === "EXW" || termsSales === "FOB") {
        freight = '';
        insurance = '';
    } else if (termsSales === "CFR" && freight > totalAmount) {
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
    const currency = document.getElementById('CURRENCY').value.toUpperCase();

    fetchExchangeRates().then(exchangeRates => {
        if (!exchangeRates || Object.keys(exchangeRates).length === 0) {
            document.getElementById('ADD_AMT').value = "無法獲取匯率數據";
            return;
        }

        const currencyRate = exchangeRates[currency]?.buyValue;

        if (!currencyRate) {
            console.error(`無法找到 ${currency} 匯率`, exchangeRates);
            document.getElementById('ADD_AMT').value = "無法獲取該幣別匯率";
            return;
        }

        const additionalFee = 500 / currencyRate;
        const decimalPlaces = currency === "TWD" ? 0 : 2;
        document.getElementById('ADD_AMT').value = new Decimal(additionalFee).toFixed(decimalPlaces);
    });
}

// 幣別異動 => 清空 運費、保險費、應加費用
document.getElementById('CURRENCY').addEventListener('input', function () {
    clearFreightInsuranceAdditional();
});

// 總毛重異動 => 清空 運費
document.getElementById('DCL_GW').addEventListener('input', function () {
    clearFreight();
});

// 總金額異動 => 清空 保險費
document.getElementById('CAL_IP_TOT_ITEM_AMT').addEventListener('input', function () {
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