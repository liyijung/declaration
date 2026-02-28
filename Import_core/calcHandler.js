// =====================
// 數量核算
// =====================
function calculateQuantities() {
    // 在執行計算前先更新所有稅則
    updateAllTariffs();

    const items = document.querySelectorAll('#item-container .item-row');
    if (items.length === 0) return;

    let unitQuantities = {};
    let stUnitQuantities = {};
    let quantityAlerts = new Set();
    const quantityRegex = /\b(\d+)\s*(PCE|PCS)\b/i;

    items.forEach(row => {
        const itemNo = row.querySelector(".item-number label")?.textContent.trim();
        if (itemNo === "*") return; // 忽略 ITEM_NO 為 "*" 的項次

        const description = (row.querySelector(".DESCRIPTION")?.value || '').trim().toUpperCase();
        const unit = row.querySelector('.DOC_UM')?.value || '';
        const quantityElement = row.querySelector('.QTY');
        const stUnit = row.querySelector('.ST_UM')?.value || '';
        const stQuantityElement = row.querySelector('.ST_QTY');

        // 檢查品名是否含有 PCE 或 PCS 且需符合條件才提示
        const quantityMatch = description.match(quantityRegex);
        if (quantityMatch) {
            const matchedQty = parseFloat(quantityMatch[1]);
            const qtyVal = parseFloat(quantityElement?.value || '');
            const stQtyVal = parseFloat(stQuantityElement?.value || '');

            const ok =
                (unit === "PCE" && !isNaN(qtyVal) && qtyVal === matchedQty) ||
                (stUnit === "PCE" && !isNaN(stQtyVal) && stQtyVal === matchedQty);

            if (!ok) {
                quantityAlerts.add("➤ 品名內含 PCE 或 PCS，請確認『數量單位』或『統計數量單位』是否合理");
            }
        }

        // 計算 DOC_UM 和 QTY
        if (quantityElement && quantityElement.value.trim() !== '') {
            const quantity = parseFloat(quantityElement.value);
            if (!isNaN(quantity)) {
                if (!unitQuantities[unit]) unitQuantities[unit] = 0;
                unitQuantities[unit] += quantity;
            }
        }

        // 計算 ST_UM 和 ST_QTY
        if (stQuantityElement && stQuantityElement.value.trim() !== '') {
            const stQuantity = parseFloat(stQuantityElement.value);
            if (!isNaN(stQuantity)) {
                if (!stUnitQuantities[stUnit]) stUnitQuantities[stUnit] = 0;
                stUnitQuantities[stUnit] += stQuantity;
            }
        }
    });

    // 構建數量總計字符串
    let unitQuantitiesString = '數量單位加總為：';
    for (const [unit, totalQuantity] of Object.entries(unitQuantities)) {
        unitQuantitiesString += `\n${parseFloat(totalQuantity.toFixed(6))} ${unit}`;
    }

    let message = unitQuantitiesString;

    // 若統計用數量單位有數據，則加入顯示
    if (Object.keys(stUnitQuantities).length > 0) {
        let stUnitQuantitiesString = '統計用數量單位加總為：';
        for (const [unit, stTotalQuantity] of Object.entries(stUnitQuantities)) {
            stUnitQuantitiesString += `\n(${parseFloat(stTotalQuantity.toFixed(6))} ${unit})`;
        }
        message += `\n\n${stUnitQuantitiesString}`;
    }

    // 顯示品名內含 PCE 或 PCS 的提醒
    if (quantityAlerts.size > 0) {
        message += `\n\n${Array.from(quantityAlerts).join('\n')}`;
    }

    alert(message);
}


// =====================
// 金額核算（改後：只檢查「項次金額加總」是否等於「表頭總金額」；不含離岸檢查；不含貿易條件規則）
// =====================
function calculateAmounts() {
    const decimalPlacesInput = document.getElementById('decimal-places');
    let decimalPlaces = parseInt(decimalPlacesInput?.value);

    // 確保小數點位數最小為0，並預設為2
    if (isNaN(decimalPlaces) || decimalPlaces < 0) decimalPlaces = 2;

    const exchangeRate = parseFloat(document.getElementById('exchange-rate')?.value) || 0;
    const exchangeThreshold = exchangeRate > 0 ? Math.round((1 / exchangeRate) * 100) / 100 : 0;
    const lowTotalPriceAlerts = []; // 存放低於門檻的提示

    const items = document.querySelectorAll('#item-container .item-row');
    if (items.length === 0) return;

    // 遍歷每個項次，先計算 DOC_TOT_P = QTY * DOC_UNIT_P
    items.forEach((row, index) => {
        const qty = new Decimal(row.querySelector('.QTY')?.value || 0); // 數量
        const unitPrice = new Decimal(row.querySelector('.DOC_UNIT_P')?.value || 0); // 單價
        const totalPriceField = row.querySelector('.DOC_TOT_P'); // 總金額欄位
        if (!totalPriceField) return;

        // 計算總金額（避免浮點誤差）
        const totalPrice = qty.mul(unitPrice);

        // 更新欄位值，保留指定小數位數
        totalPriceField.value = totalPrice.toFixed(decimalPlaces);

        const itemNumber = row.querySelector('.item-number label')?.innerText.trim();

        // 判斷 DOC_TOT_P 是否不足台幣 1 元（排除 * 項次）
        if (exchangeRate > 0 && totalPrice.lessThan(exchangeThreshold) && itemNumber !== '*') {
            totalPriceField.style.backgroundColor = '#ffeb3b';
            lowTotalPriceAlerts.push(`➤ No. ${index + 1} 項次金額 ${totalPrice.toFixed(decimalPlaces)} 不足台幣 1 元，請確認。`);
        } else {
            totalPriceField.style.backgroundColor = '';
        }
    });

    // 計算各項次金額的加總（DOC_TOT_P）
    let totalItemsAmount = Array.from(items).reduce((sum, row) => {
        const amount = parseFloat(row.querySelector('.DOC_TOT_P')?.value);
        return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    const totalDocumentAmount = parseFloat(document.getElementById('CAL_IP_TOT_ITEM_AMT')?.value) || 0;
    const currency = document.getElementById('CURRENCY')?.value || '';

    // === 只檢查：項次加總 vs 表頭總金額 ===
    let calculationAlerts = "";
    const a = Number(totalItemsAmount);
    const b = Number(totalDocumentAmount);

    const isEqual =
        a.toFixed(decimalPlaces) === b.toFixed(decimalPlaces) ||
        a.toFixed(2) === b.toFixed(2) ||
        Math.abs(a - b) < 0.0001;

    if (isEqual) {
        calculationAlerts =
            `【金額核算：項次金額加總比對表頭總金額】\n` +
            `各項次金額的加總為：${currency} ${a.toFixed(decimalPlaces)}\n` +
            `----------------------------------------------------\n` +
            `報單表頭的總金額為：${currency} ${b.toFixed(decimalPlaces)}【正確】\n`;
    } else {
        calculationAlerts =
            `【金額核算：項次金額加總比對表頭總金額】\n` +
            `各項次金額的加總為：${currency} ${a.toFixed(decimalPlaces)}\n` +
            `----------------------------------------------------\n` +
            `報單表頭的總金額為：${currency} ${b.toFixed(decimalPlaces)}【錯誤！】\n`;
    }

    // 關鍵字分類及對應提示
    const keywordMessages = {
        additionalCosts: ["COST", "FEE", "CHARGE", "FREIGHT", "INSURANCE", "DISCOUNT", "SHIPPING", "POSTAGE"],
    };

    // 關鍵字正則（完整單詞比對）
    const keywordRegex = {};
    Object.keys(keywordMessages).forEach(category => {
        keywordRegex[category] = new RegExp(`\\b(${keywordMessages[category].join('|')})\\b`, 'gi');
    });

    const categoryMessages = {
        additionalCosts: "請確認是否為其他費用。",
    };

    // 檢查項次描述欄位是否包含指定關鍵字
    let keywordAlerts = [];
    items.forEach((row, index) => {
        const description = row.querySelector('.DESCRIPTION')?.value || '';
        let matchedKeywords = [];

        Object.keys(keywordMessages).forEach(category => {
            const matches = description.match(keywordRegex[category]);
            if (matches) {
                matchedKeywords.push(...matches);
                keywordAlerts.push(`➤ No. ${index + 1} 內含關鍵字 "${matches.join(', ')}"，${categoryMessages[category]}`);
            }
        });

        // 沒有命中關鍵字才做原本的行內計算（如果有這支函式）
        if (matchedKeywords.length === 0 && typeof calculateAmountsForRow === 'function') {
            calculateAmountsForRow(row, decimalPlaces);
        }
    });

    // 合併顯示計算結果提示與關鍵字提示 & 低於台幣 1 元提示
    const combinedAlerts = [calculationAlerts, ...keywordAlerts, ...lowTotalPriceAlerts].join('\n');
    if (combinedAlerts) alert(combinedAlerts);
}


// =====================
// 重量核算
// =====================
function calculateWeight() {
    const totalNetWeight = parseFloat(document.getElementById('DCL_NW')?.value);
    if (isNaN(totalNetWeight) || totalNetWeight <= 0) return;

    const items = document.querySelectorAll('#item-container .item-row');
    if (items.length === 0) return;

    let totalCalculatedWeight = 0;

    items.forEach((item) => {
        const netWeight = parseFloat(item.querySelector('.NET_WT')?.value);
        if (!isNaN(netWeight)) totalCalculatedWeight += netWeight;
    });

    // 確保結果最多顯示六位小數
    totalCalculatedWeight = parseFloat(totalCalculatedWeight.toFixed(6));

    if (totalNetWeight === totalCalculatedWeight) {
        alert(`報單表頭的總淨重為：${totalNetWeight}【正確】\n各項次的淨重加總為：${totalCalculatedWeight}`);
    } else {
        alert(`報單表頭的總淨重為：${totalNetWeight}【錯誤！】\n各項次的淨重加總為：${totalCalculatedWeight}`);
    }
}


// =====================
// 核算
// =====================
function calculate() {
    let messages = [];

    const items = document.querySelectorAll('#item-container .item-row');
    if (items.length === 0) {
        messages.push('請先新增至少一個項次。');
    }

    const totalNetWeight = parseFloat(document.getElementById('DCL_NW')?.value);
    if (isNaN(totalNetWeight) || totalNetWeight <= 0) {
        messages.push('請先填寫有效的總淨重。');
    }

    if (messages.length > 0) {
        alert(messages.join('\n'));
        return;
    }

    calculateQuantities(); // 數量核算
    calculateAmounts();    // 金額核算（改後版本）
    calculateWeight();     // 重量核算

    // 更新欄位顯示狀態
    if (typeof initializeFieldVisibility === 'function') {
        initializeFieldVisibility();
    }

    // 更新核算狀態
    const statusEl = document.getElementById("calculation-status");
    if (statusEl) statusEl.value = "已執行";
}


