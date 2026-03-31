// 匯入XML的功能
function importXML(event) {
    termsSalesHintShown = false;   // ⭐ 新資料 → 可以再提示貿易條件
    
    clearField(); // 清空輸入框內容

    // 清空 calculation-status
    document.getElementById('calculation-status').value = "";

    const file = event.target.files[0];
    if (file) {

        // 匹配檔名前面的數字部分
        const match = file.name.match(/^\d+/);
        const fileNumber = match ? match[0] : ''; // 如果沒有匹配到，設為空字符串
        document.getElementById('FILE_NO').value = fileNumber;

        // 提取【】內的文字
        const matchRemark = file.name.match(/【(.*?)】/);
        let fileRemark = matchRemark ? matchRemark[1] : ''; // 若無則回傳空字串

        // 若開頭包含「一般倉，」或「一般倉」則移除
        fileRemark = fileRemark.replace(/^一般倉，?/, '').trim();
        
        document.getElementById('REMARK').value = fileRemark;

        const reader = new FileReader();
        reader.onload = function (e) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(e.target.result, "application/xml");

            // 解析表頭資料
            const headerFields = xmlDoc.getElementsByTagName("head")[0].getElementsByTagName("fields");
            Array.from(headerFields).forEach(field => {
                const nameNode = field.getElementsByTagName("field_name")[0];
                if (!nameNode) return;                          // 沒有 field_name 就略過

                const valueNode = field.getElementsByTagName("field_value")[0];
                if (!valueNode || !valueNode.textContent) return; // 沒有值就略過（避免 undefined）

                const rawName = nameNode.textContent.trim();
                const mappedName = xmlHeaderNameMap[rawName] || rawName;  // ★ 使用 mapping
                const fieldValue = unescapeXml(valueNode.textContent);

                const element = document.getElementById(mappedName);
                if (element) {
                    element.value = fieldValue;
                }
            });

            searchData(false); // 統一編號搜尋
            lookupExchangeRate(); // 當旬匯率
            handleCheck(); // 長期委任字號
            thingsToNote(); // 進口備註

            // 執行必填與不得填列欄位的檢查邏輯
            document.getElementById('CNEE_COUNTRY_CODE').dispatchEvent(new Event('input'));
            document.getElementById('TERMS_SALES').dispatchEvent(new Event('change'));

            // 解析項次資料
            const items = xmlDoc.getElementsByTagName("detail")[0].getElementsByTagName("items");
            const itemContainer = document.getElementById('item-container');
            itemContainer.innerHTML = ''; // 清空現有項次
            itemCount = 0; // 重置項次計數

            Array.from(items).forEach(item => {
                const itemData = {};
                const fields = item.getElementsByTagName("fields");
                Array.from(fields).forEach(field => {
                    const nameNode = field.getElementsByTagName("field_name")[0];
                    if (!nameNode) return;                           // 沒欄位名就略過

                    const rawName = nameNode.textContent.trim();
                    const mappedName = xmlItemNameMap[rawName] || rawName;  // ★ 使用 mapping

                    const valueNode = field.getElementsByTagName("field_value")[0];
                    const fieldValue = valueNode && valueNode.textContent
                        ? unescapeXml(valueNode.textContent)
                        : '';                                        // 沒 value 就當空字串

                    itemData[mappedName] = fieldValue;
                });
                const itemRow = createItemRow(itemData);
                itemContainer.appendChild(itemRow);
            });

            updateCneeCNameVisibility();
            initializeListeners();
            renumberItems(); // 重新編號所有項次
            updateRemark1FromImport(); // 更新REMARK1欄位並勾選對應的checkbox
        };
        reader.readAsText(file, "UTF-8");
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    // 添加事件監聽器到匯入XML按鈕
    document.getElementById('import-xml').addEventListener('change', importXML, false);
});

// 匯出XML的功能(含檢查)
document.addEventListener('DOMContentLoaded', function () {
    // 為 QTY 和 DOC_UNIT_P 輸入框添加事件監聽器
    document.querySelectorAll('.QTY, .DOC_UNIT_P').forEach(function (element) {
        element.addEventListener('input', calculateAmount);
    });
    
    const termsEl = document.getElementById('TERMS_SALES');
    
    if (termsEl && termsEl.dataset.boundTermsHint !== '1') {
    
        termsEl.dataset.boundTermsHint = '1';
    
        termsEl.addEventListener('change', () => {
    
            termsSalesHintShown = false;   // ⭐ 使用者改了貿易條件 → 允許重新提示
    
            showTermsSalesHints();
    
        });
    
    }

    function updateVariables() {
        const appDutyRefund = document.getElementById('APP_DUTY_REFUND');
        const markTotLines = document.getElementById('MARK_TOT_LINES');
        const examType = document.getElementById('EXAM_TYPE');
        const copyQty = document.getElementById('COPY_QTY');

        const copy2 = document.getElementById('copy_2');
        const copy3 = document.getElementById('copy_3');
        const copy5 = document.getElementById('copy_5');

        // 用於顯示變數值的控制台日誌
        console.log("APP_DUTY_REFUND: " + appDutyRefund.value);
        console.log("MARK_TOT_LINES: " + markTotLines.value);
        console.log("EXAM_TYPE: " + examType.value);
        console.log("COPY_QTY: " + copyQty.value);
    }

    // 添加事件監聽器到報單副本選項
    document.querySelectorAll('input[type="checkbox"][name="copy_option"]').forEach(checkbox => {
        checkbox.addEventListener('change', updateRemark1);
    });

    async function exportToXML() {
        updateVariables(); // 在匯出XML之前更新變數

        const requiredFields = [
            { id: 'FILE_NO', name: '文件編號' },
            { id: 'SHPR_BAN_ID', name: '進口人統一編號' },
            { id: 'SHPR_C_NAME', name: '進口人中文名稱' },
            { id: 'SHPR_C_ADDR', name: '進口人中文地址' },
            { id: 'CNEE_E_ADDR', name: '賣方中/英地址' },
            { id: 'CNEE_COUNTRY_CODE', name: '賣方國家代碼' },
            { id: 'DOC_CTN_UM', name: '總件數單位' },
            { id: 'DCL_DOC_TYPE', name: '報單類別' },
            { id: 'TERMS_SALES', name: '貿易條件' },
            { id: 'CURRENCY', name: '幣別' },
            { id: 'CAL_IP_TOT_ITEM_AMT', name: '總金額' }
        ];

        // 檢查是否有未填寫的必要欄位
        let missingFields = [];
        requiredFields.forEach(field => {
            let element = document.getElementById(field.id);
            if (element && !element.value.trim()) {
                missingFields.push(field.name);
            }
        });

        // 統一處理 SHPR_E_NAME 和 SHPR_E_ADDR
        function updateFieldIfEmpty(targetId, sourceId) {
            let sourceElement = document.getElementById(sourceId);
            let targetElement = document.getElementById(targetId);

            if (sourceElement && targetElement) {
                targetElement.value = targetElement.value?.trim() || sourceElement.value.trim();
            }
        }

        // 更新 SHPR_E_NAME (若無值則使用 SHPR_C_NAME)
        updateFieldIfEmpty('SHPR_E_NAME', 'SHPR_C_NAME');

        // 更新 SHPR_E_ADDR (若無值則使用 SHPR_C_ADDR)
        updateFieldIfEmpty('SHPR_E_ADDR', 'SHPR_C_ADDR');

        // 單獨檢查 CNEE_C_NAME 和 CNEE_E_NAME
        let cneeCName = document.getElementById('CNEE_C_NAME');
        let cneeEName = document.getElementById('CNEE_E_NAME');

        if (
            (!cneeCName || !cneeCName.value.trim()) &&
            (!cneeEName || !cneeEName.value.trim())
        ) {
            missingFields.push('賣方中/英名稱');
        }

        // 單獨檢查 CNEE_COUNTRY_CODE
        let countryCodeElement = document.getElementById('CNEE_COUNTRY_CODE');
        if (countryCodeElement && countryCodeElement.value.trim() === 'TW') {
            // 檢查 CNEE_BAN_ID 是否填寫
            const additionalFields = [
                { id: 'CNEE_BAN_ID', name: '賣方統一編號' }
            ];

            additionalFields.forEach(field => {
                let element = document.getElementById(field.id);
                if (element && !element.value.trim()) {
                    missingFields.push(field.name);
                }
            });
        }

        // 如果有未填寫的欄位，提示使用者
        if (missingFields.length > 0) {
            alert(`以下欄位為空，請填寫後再匯出：\n${missingFields.join('、')}`);
            return; // 中止匯出過程
        }

        // 檢查總毛重是否大於總淨重（允許空值，只有兩者都有填時才檢查）
        let dclGwRaw = document.getElementById('DCL_GW')?.value.trim() || '';
        let dclNwRaw = document.getElementById('DCL_NW')?.value.trim() || '';

        let dclGw = dclGwRaw === '' ? null : parseFloat(dclGwRaw);
        let dclNw = dclNwRaw === '' ? null : parseFloat(dclNwRaw);

        // 若有填但不是數字，仍提示
        if (dclGwRaw !== '' && isNaN(dclGw)) {
            alert('總毛重格式錯誤，請確認後再匯出');
            return;
        }

        if (dclNwRaw !== '' && isNaN(dclNw)) {
            alert('總淨重格式錯誤，請確認後再匯出');
            return;
        }

        // 只有兩者都有值時才檢查大小
        if (dclGw !== null && dclNw !== null && dclGw <= dclNw) {
            alert('總毛重必須大於總淨重，請確認後再匯出');
            return;
        }

        // 檢查進口報單類別
        const dclDocType = document.getElementById('DCL_DOC_TYPE').value.trim().toUpperCase();
        const exportTypes = ['G1', 'G7', 'B6'];
        if (!exportTypes.includes(dclDocType)) {
            alert(`${dclDocType} 非進口報單類別，請確認！`);
            return;
        }

        showTermsSalesHints();   // 檢查貿易條件(只提示，不擋匯出)
        
        const itemRequiredFields = [
            { className: 'DESCRIPTION', name: '品名' },
            { className: 'QTY', name: '數量' },
            { className: 'DOC_UM', name: '單位' },
            { className: 'DOC_UNIT_P', name: '單價' },
            { className: 'DOC_TOT_P', name: '金額' },
            { className: 'CCC_CODE', name: '稅則' },
            { className: 'TAX_RATE', name: '稅率' },
            { className: 'ST_MTD', name: '納稅辦法' },
            { className: 'ORG_COUNTRY', name: '生產國別' }
        ];

        // B6：SHPR_BONDED_ID + 買方料號 必填
        if (['B6'].includes(dclDocType)) {
            let missingFields = [];
        
            // 檢查 SHPR_BONDED_ID
            let shprBondedId = document.getElementById('SHPR_BONDED_ID')?.value.trim();
            if (!shprBondedId) {
                missingFields.push('海關監管編號');
            }
        
            // 檢查 SELLER_ITEM_CODE（每個項次）
            document.querySelectorAll('.item-row').forEach(item => {
                let element = item.querySelector('.SELLER_ITEM_CODE');
                if (!element || !element.value.trim()) {
                    missingFields.push('買方料號');
                }
            });
        
            if (missingFields.length > 0) {
                alert(`當報單類別為 B6 時，下列欄位需填列：\n${[...new Set(missingFields)].join('、')}`);
                return;
            }
        }
        
        // ❗ 非 B6 → 完全不檢查（不要 else）

        let itemContainer = document.querySelectorAll("#item-container .item-row");
        let itemNoCheckedCount = 0; // 用來計算連續勾選大品名註記的次數

        for (let item of itemContainer) {
            let itemNoChecked = item.querySelector('.ITEM_NO').checked;

            if (itemNoChecked) { // 若 ITEM_NO 已勾選
                itemNoCheckedCount++; // 計算連續勾選次數

                // 檢查 DESCRIPTION 是否有值
                let descriptionElement = item.querySelector('.DESCRIPTION');
                if (!descriptionElement || !descriptionElement.value.trim()) {
                    alert('已勾選大品名註記，品名必須有值');
                    return; // 中止匯出過程
                }

                // 檢查除了 DESCRIPTION 外，其他欄位是否有值
                let invalidFields = [];
                itemRequiredFields.forEach(field => {
                    if (field.className !== 'DESCRIPTION') {
                        let element = item.querySelector(`.${field.className}`);
                        if (element && element.value.trim()) {
                            invalidFields.push(field.name);
                        }
                    }
                });

                if (invalidFields.length > 0) {
                    alert(`已勾選大品名註記，以下欄位不應有值：\n${invalidFields.join('、')}`);
                    return; // 中止匯出過程
                }

            } else { // 若 ITEM_NO 未勾選，進行其他檢查

                // 若未勾選大品名註記，將計數重置
                itemNoCheckedCount = 0;

                let itemMissingFields = [];

                itemRequiredFields.forEach(field => {
                    let element = item.querySelector(`.${field.className}`);
                    if (element && !element.value.trim()) {
                        itemMissingFields.push(field.name);
                    }
                });

                // 成對欄位檢查
                const pairedFields = [
                    { fields: ['ORG_IMP_DCL_NO', 'ORG_IMP_DCL_NO_ITEM'], names: ['原出口報單號碼', '原出口報單項次'] },
                    { fields: ['CERT_NO', 'TARIFF_CODE'], names: ['產證號碼', '稅則附碼'] },
                    { fields: ['WIDE', 'WIDE_UM'], names: ['寬度(幅寬)', '寬度單位'] },
                    { fields: ['LENGT_', 'LENGTH_UM'], names: ['長度(幅長)', '長度單位'] },
                    { fields: ['ST_QTY', 'ST_UM'], names: ['統計數量', '統計單位'] },
                ];

                // 檢查成對欄位是否同時有值
                pairedFields.forEach(pair => {
                    let firstElement = item.querySelector(`.${pair.fields[0]}`);
                    let secondElement = item.querySelector(`.${pair.fields[1]}`);

                    // 檢查成對欄位是否同時有值或同時為空
                    if ((firstElement && firstElement.value.trim() && !secondElement.value.trim()) ||
                        (secondElement && secondElement.value.trim() && !firstElement.value.trim())) {
                        itemMissingFields.push(`${pair.names[0]} 和 ${pair.names[1]} 必須同時有值`);
                    }
                });

                // 檢查淨重是否為零
                let netWtElement = item.querySelector('.NET_WT');
                if (netWtElement && parseFloat(netWtElement.value.trim()) === 0) {
                    itemMissingFields.push('淨重不得為零');
                }

                if (itemMissingFields.length > 0) {
                    alert(`以下欄位不可為空或為零：\n${itemMissingFields.join('、')}`);
                    return; // 中止匯出過程
                }
            }

            // 檢查是否有連續兩個以上的「大品名註記」勾選
            if (itemNoCheckedCount > 1) {
                alert('大品名註記不可連續勾選兩個以上');
                return; // 中止匯出過程
            }
        }

        // ✅ 檢查：項次金額加總是否等於總金額 CAL_IP_TOT_ITEM_AMT
        function parseMoney(val) {
            // 允許空白；去千分位逗號；轉數字
            const s = String(val ?? '').trim().replace(/,/g, '');
            if (!s) return 0;
            const n = parseFloat(s);
            return isNaN(n) ? NaN : n;
        }
        
        function round2(n) {
            return Math.round((n + Number.EPSILON) * 100) / 100;
        }
        
        // 取得總金額（表頭）
        const headerTotal = parseMoney(document.getElementById('CAL_IP_TOT_ITEM_AMT')?.value);
        
        // 逐項加總 DOC_TOT_P（忽略大品名註記 ITEM_NO = * 的列）
        let sumItems = 0;
        let hasNaN = false;
        
        document.querySelectorAll("#item-container .item-row").forEach(item => {
            const isBigDesc = item.querySelector('.ITEM_NO')?.checked; // 勾選代表 ITEM_NO = *
            if (isBigDesc) return;
        
            const v = parseMoney(item.querySelector('.DOC_TOT_P')?.value);
            if (isNaN(v)) {
                hasNaN = true;
                return;
            }
            sumItems += v;
        });
        
        if (hasNaN) {
            alert('項次金額(金額/DOC_TOT_P) 含有非數字，請確認後再匯出');
            return; // 中止匯出過程
        }
        
        if (isNaN(headerTotal)) {
            alert('總金額(CAL_IP_TOT_ITEM_AMT) 含有非數字，請確認後再匯出');
            return; // 中止匯出過程
        }
        
        // 以「小數兩位」比對（避免浮點誤差）
        const headerTotal2 = round2(headerTotal);
        const sumItems2 = round2(sumItems);
        
        // 先判斷是否為項次小於總額
        if (sumItems2 < headerTotal2) {
            const diff = round2(headerTotal2 - sumItems2); // 總額 - 項次加總
        
            const exchangeRate = parseFloat(document.getElementById('usd-exchange-rate')?.value || 0);
        
            if (!exchangeRate || isNaN(exchangeRate)) {
                alert('匯率尚未取得，請重新查詢匯率');
                return;
            }
            
            // 台幣差額取整數
            const diffTWD = Math.round(diff * exchangeRate);
        
            // 若差額換算台幣 >= 20，才擋下
            if (diffTWD >= 20) {
                alert(
                    `項次金額加總與總金額不一致，請確認：\n` +
                    `項次加總(金額) = ${sumItems2}\n` +
                    `總金額 = ${headerTotal2}\n` +
                    `差額(總額-項次) = ${diff}\n` +
                    `差額(台幣) = ${diffTWD}`
                );
                return;
            }
            
        } else if (sumItems2 > headerTotal2) {
        
            const diff = round2(sumItems2 - headerTotal2);
        
            alert(
                `項次金額加總與總金額不一致，請確認：\n` +
                `項次加總(金額) = ${sumItems2}\n` +
                `總金額 = ${headerTotal2}\n` +
                `差額(項次-總額) = ${diff}`
            );
            return;
        }
        
        // 欄位碼數檢查設定
        const fieldLengthChecks = [
            { id: 'FILE_NO', name: '文件編號', validLengths: [12] },
            { id: 'SHPR_BONDED_ID', name: '海關監管編號', validLengths: [5] },
            { id: 'CNEE_COUNTRY_CODE', name: '賣方國家代碼', validLengths: [2] },
            { id: 'DOC_CTN_UM', name: '總件數單位', validLengths: [3] },
            { id: 'DCL_DOC_TYPE', name: '報單類別', validLengths: [2] },
            { id: 'TERMS_SALES', name: '貿易條件', validLengths: [3] },
            { id: 'CURRENCY', name: '幣別', validLengths: [3] },
        ];

        // 執行碼數檢查
        let invalidLengthFields = [];

        fieldLengthChecks.forEach(field => {
            let element = document.getElementById(field.id);
            if (element && element.value.trim()) { // 如果欄位有值則進行檢查
                let length = element.value.trim().length;
                if (!field.validLengths.includes(length)) {
                    invalidLengthFields.push(`${field.name} (應為 ${field.validLengths.join(' 或 ')} 碼)`);
                }
            }
        });

        if (invalidLengthFields.length > 0) {
            alert(`以下欄位的碼數不正確：\n${invalidLengthFields.join('、')}`);
            return; // 中止匯出過程
        }

        // 欄位碼數檢查設定 (每個項次都需檢查的欄位)
        const itemFieldLengthChecks = [
            { className: 'DOC_UM', name: '單位', validLengths: [3] },
            { className: 'CCC_CODE', name: '稅則', validLengths: [11] },
            { className: 'ST_MTD', name: '納稅辦法', validLengths: [2] },
            { className: 'ORG_COUNTRY', name: '生產國別', validLengths: [2] },
            { className: 'ORG_IMP_DCL_NO', name: '原出口報單號碼', validLengths: [14] },
            { className: 'CERT_NO', name: '產證號碼', validLengths: [15] },
            { className: 'EXP_NO', name: '輸入許可號碼', validLengths: [14] },
            { className: 'EXP_NO2', name: '輸入許可號碼2', validLengths: [14] },
            { className: 'EXP_NO3', name: '輸入許可號碼3', validLengths: [14] },
            { className: 'EXP_NO4', name: '輸入許可號碼4', validLengths: [14] },
            { className: 'EXP_NO5', name: '輸入許可號碼5', validLengths: [14] },
            { className: 'WIDE_UM', name: '寬度單位', validLengths: [3] },
            { className: 'LENGTH_UM', name: '長度單位', validLengths: [3] },
            { className: 'GOV_ASGN_NO', name: '主管機關指定代號', validLengths: [3] },
            { className: 'ST_UM', name: '統計單位', validLengths: [3] }
        ];

        // 檢查每個項次的欄位碼數
        for (let item of document.querySelectorAll("#item-container .item-row")) {
            let invalidItemFields = [];

            for (let field of itemFieldLengthChecks) {
                let element = item.querySelector(`.${field.className}`);
                if (element && element.value.trim()) { // 如果欄位有值則進行檢查
                    let value = element.value.trim();

                    // 特別處理 CCC_CODE，移除符號 '.' 和 '-'
                    if (field.className === 'CCC_CODE') {
                        // 檢查是否包含符號 '.' 或 '-'
                        if (!value.includes('.') && !value.includes('-')) {
                            alert(`稅則錯誤！`);
                            return; // 中止匯出過程
                        }
                        // 移除符號進行長度檢查
                        value = value.replace(/[.\-]/g, '');
                    }

                    let length = value.length;
                    if (!field.validLengths.includes(length)) {
                        invalidItemFields.push(`${field.name} (應為 ${field.validLengths.join(' 或 ')} 碼)`);
                    }
                }
            }

            if (invalidItemFields.length > 0) {
                alert(`以下欄位的碼數不正確：\n${invalidItemFields.join('、')}`);
                return; // 中止匯出過程
            }
        }

        // 用於驗證是否為整數
        function isInteger(value) {
            return /^\d+$/.test(value);
        }

        // 檢查 ORG_IMP_DCL_NO_ITEM、CERT_NO_ITEM 是否為整數
        for (let item of document.querySelectorAll("#item-container .item-row")) {
            let invalidItemFields = [];

            // 檢查這四個欄位並顯示對應的中文名稱
            [
                { className: 'ORG_IMP_DCL_NO_ITEM', name: '原出口報單項次' },
                { className: 'CERT_NO_ITEM', name: '產證項次' },
            ].forEach(field => {
                let element = item.querySelector(`.${field.className}`);
                if (element && element.value.trim() && !isInteger(element.value.trim())) {
                    invalidItemFields.push(`${field.name} (僅限輸入整數)`);
                }
            });

            if (invalidItemFields.length > 0) {
                alert(`以下欄位的格式錯誤：\n${invalidItemFields.join('、')}`);
                return; // 中止匯出過程
            }
        }

        // 若單位為 PCE、PCS 或 EAC，檢查數量是否為整數
        for (let item of document.querySelectorAll("#item-container .item-row")) {
            let invalidItemFields = [];

            // 獲取數量和單位欄位
            let qtyElement = item.querySelector('.QTY');
            let docUmElement = item.querySelector('.DOC_UM');

            if (qtyElement && docUmElement) {
                let rawQtyValue = qtyElement.value.trim(); // 原始數量值
                let parsedQtyValue = parseFloat(rawQtyValue); // 將數量值轉換為浮點數
                let docUmValue = docUmElement.value.trim().toUpperCase();

                // 若單位為 PCE、PCS 或 EAC，檢查數量是否為整數
                if (['PCE', 'PCS', 'EAC'].includes(docUmValue)) {
                    // 檢查數值是否為整數
                    if (!Number.isInteger(parsedQtyValue)) {
                        invalidItemFields.push(`數量 " ${rawQtyValue} " (單位為 ${docUmValue} 時，數量必須為整數)`);
                    }
                }
            }

            if (invalidItemFields.length > 0) {
                alert(`以下欄位的格式錯誤：\n${invalidItemFields.join('、')}`);
                return; // 中止匯出過程
            }
        }

        // 若 validateDclDocType 發現錯誤，則直接返回，中止後續程式碼
        if (!validateDclDocType()) {
            return;
        }

        // 賣方名稱及地址欄位不可全數字
        const nonNumericFields = [
            { id: 'CNEE_C_NAME', name: '賣方中文名稱' },
            { id: 'CNEE_E_NAME', name: '賣方中/英名稱' },
            { id: 'CNEE_E_ADDR', name: '賣方中/英地址' }
        ];

        let allDigitsErrors = [];
        nonNumericFields.forEach(field => {
            let element = document.getElementById(field.id);
            if (element) {
                let value = element.value.trim();
                // 如果欄位有值且全部都是數字，則加入錯誤訊息
                if (value && /^\d+$/.test(value)) {
                    allDigitsErrors.push(field.name);
                }
            }
        });

        if (allDigitsErrors.length > 0) {
            alert(`以下欄位不可全數字：\n${allDigitsErrors.join('、')}`);
            return; // 中止匯出過程
        }

        if (['G1', 'G7'].includes(dclDocType)) {
            let docMarksDesc = document.getElementById('DOC_MARKS_DESC')?.value.trim().toUpperCase() || '';
            let docOtrDesc = document.getElementById('DOC_OTR_DESC')?.value.trim().toUpperCase() || '';

            // 檢查所有項次的 DESCRIPTION 是否包含 "MADE IN"（但忽略 ITEM_NO 為 "*" 的項次）
            let hasMadeInInDescription = Array.from(document.querySelectorAll("#item-container .item-row"))
                .some(item => {
                    const itemNo = item.querySelector(".item-number label")?.textContent.trim(); // 取得 ITEM_NO
                    const description = item.querySelector(".DESCRIPTION")?.value.trim().toUpperCase();
                    return itemNo !== "*" && description.includes("MADE IN");
                });
        }

        // 取得核算狀態
        if (document.getElementById('calculation-status')?.value.trim() !== "已執行") {
            alert("請先執行核算後再匯出 XML！");
            return;
        }

        // 匯出XML(已完成檢查)
        const headerFields = [
            'FILE_NO', 'LOT_NO', 'SHPR_BAN_ID', 'DCL_DOC_EXAM', 'SHPR_BONDED_ID',
            'SHPR_C_NAME', 'SHPR_E_NAME', 'SHPR_C_ADDR', 'SHPR_E_ADDR', 'SHPR_TEL',
            'CNEE_C_NAME', 'CNEE_E_NAME', 'CNEE_E_ADDR',
            'CNEE_COUNTRY_CODE', 'CNEE_BAN_ID',
            'ARRIVAL_DATE', 'ACCEPTANCE_DATE', 'EXIT_DATE', 'JOURNEY_ID', 'LOADING_LOCATION',
            'TOT_CTN', 'DOC_CTN_UM', 'CTN_DESC', 'DCL_GW', 'DCL_NW',
            'DCL_DOC_TYPE', 'TERMS_SALES', 'CURRENCY', 'CAL_IP_TOT_ITEM_AMT',
            'FRT_AMT', 'INS_AMT', 'ADD_AMT', 'SUBTRACT_AMT',
            'DOC_MARKS_DESC', 'DOC_OTR_DESC', 'MEMO2', 'REMARK1',
            'FAC_BAN_ID_EX', 'FAC_BONDED_ID_EX',
            'FAC_BAN_ID', 'FAC_BONDED_ID', 'IN_BONDED_BAN', 'IN_BONDED_CODE',
            'APP_DUTY_REFUND', 'MARK_TOT_LINES', 'EXAM_TYPE', 'COPY_QTY',
        ];

        const itemFields = [
            'DESCRIPTION', 'QTY', 'DOC_UM', 'DOC_UNIT_P', 'DOC_TOT_P',
            'CCC_CODE', 'TAX_RATE', 'ST_MTD', 'ISCALC_WT', 'NET_WT', 'ORG_COUNTRY',
            'TRADE_MARK', 'GOODS_MODEL', 'GOODS_SPEC',
            'ORG_IMP_DCL_NO', 'ORG_IMP_DCL_NO_ITEM', 'SELLER_ITEM_CODE', 'BOND_NOTE',
            'CERT_NO', 'CERT_NO_ITEM', 'TARIFF_CODE', 
            'EXP_NO', 'EXP_SEQ_NO','EXP_NO2', 'EXP_SEQ_NO2','EXP_NO3', 'EXP_SEQ_NO3',
            'EXP_NO4', 'EXP_SEQ_NO4','EXP_NO5', 'EXP_SEQ_NO5',
            'WIDE', 'WIDE_UM', 'LENGT_', 'LENGTH_UM', 'GOV_ASGN_NO', 'ST_QTY', 'ST_UM',
        ];

        let xmlContent =
            '<?xml version="1.0" encoding="UTF-8"?>\n' +
            '<Root>\n' +
            '  <sys_code>GICCDSI</sys_code>\n' +
            '<head>\n' +
            '  <head_table_name>DOC_H_I</head_table_name>\n';

        // 取得製單人員輸入值，若為空則預設為 ''
        let maker = document.getElementById('Maker') ? document.getElementById('Maker').value : '';

        // 添加 PROC_NO 欄位
        xmlContent += `  <fields>\n    <field_name>PROC_NO</field_name>\n    <field_value>${maker}</field_value>\n  </fields>\n`;

        // 取得 SHPR_BAN_ID 欄位的值
        const shprBanIdElement = document.getElementById('SHPR_BAN_ID');
        const shprBanId = shprBanIdElement ? shprBanIdElement.value.trim() : '';

        // 添加 SHPR_AEO 欄位
        const shprAeo = await getAeoNumber(shprBanId);  // 呼叫共用函數
        xmlContent += `  <fields>\n    <field_name>SHPR_AEO</field_name>\n    <field_value>${shprAeo}</field_value>\n  </fields>\n`;

        headerFields.forEach(id => {
            let element = document.getElementById(id);
            if (element) {
                let value = escapeXml(element.value);

                // 過濾非可見字符、控制代碼及無效字符
                value = value.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF9-\uFFFB\uFFFE\uFFFF]/g, '')
                    .replace(/[\u00A0]/g, ' ')
                    .trim();

                // 對 CURRENCY 欄位進行特殊處理
                if (id === 'CURRENCY') {
                    value = value.toUpperCase(); // 將值轉為大寫
                    if (value === 'NTD') {
                        value = 'TWD'; // 如果是 NTD，則改為 TWD
                    }
                }

                // 對 FILE_NO 欄位進行處理
                if (id === 'FILE_NO') {
                    let tagName = 'DOC_HEAD_DOC_NO';
                    let fileNo = value.trim();
                
                    xmlContent += `  <fields>
                    <field_name>${tagName}</field_name>
                    <field_value>${fileNo}</field_value>
                  </fields>\n`;
                    return;
                }

                // 對 LOT_NO 欄位進行處理
                if (id === 'LOT_NO') {
                    // 全形轉半形
                    value = value.replace(/[\uff01-\uff5e]/g, function (ch) {
                        return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
                    });

                    // 只允許 S, F 和數字
                    value = value.replace(/[^SF0-9]/gi, '');
                }

                // 特殊處理 CNEE_C_NAME 和 CNEE_E_NAME
                if (id === 'CNEE_C_NAME') {
                    let cneeENameElement = document.getElementById('CNEE_E_NAME');
                    let cneeENameValue = cneeENameElement ? escapeXml(cneeENameElement.value).trim() : '';

                    if (cneeENameValue) {
                        // 如果 CNEE_E_NAME 有值，則分別創建兩個節點
                        xmlContent += `  <fields>\n    <field_name>${id}</field_name>\n    <field_value>${value}</field_value>\n  </fields>\n`;
                    } else {
                        // 如果 CNEE_E_NAME 無值，用 CNEE_C_NAME 的值創建 CNEE_E_NAME
                        xmlContent += `  <fields>\n    <field_name>CNEE_E_NAME</field_name>\n    <field_value>${value}</field_value>\n  </fields>\n`;
                    }
                    return; // 不再生成 CNEE_C_NAME 的節點
                }

                if (id === 'CNEE_E_NAME') {
                    let cneeCNameElement = document.getElementById('CNEE_C_NAME');
                    let cneeCNameValue = cneeCNameElement ? escapeXml(cneeCNameElement.value).trim() : '';

                    if (!value && cneeCNameValue) {
                        // 如果 CNEE_E_NAME 無值且 CNEE_C_NAME 有值，已由 CNEE_C_NAME 處理，不再創建
                        return;
                    }
                }

                // 處理 REMARK1，將 REMARK 加入最前面，然後加入 XML
                if (id === 'REMARK1') {
                    let remark1Element = document.getElementById('REMARK1');
                    let remarkElement = document.getElementById('REMARK');

                    // 如果 REMARK1 不存在，則動態創建
                    if (!remark1Element) {
                        console.warn("REMARK1 不存在，正在創建...");
                        remark1Element = document.createElement("textarea");
                        remark1Element.id = "REMARK1";
                        remark1Element.style.display = "none"; // 不影響畫面
                        document.body.appendChild(remark1Element);
                    }

                    if (remark1Element) {
                        let remark1Value = remark1Element.value.trim();
                        let remarkValue = remarkElement ? remarkElement.value.trim() : '';

                        // 先移除 `REMARK1` 內的 `【客服備註】xxx`
                        remark1Value = remark1Value.replace(/【客服備註】[^\n]+(\n\n)?/, '').trim();

                        // 如果 `REMARK` 有值，則加到 `REMARK1` 最前面
                        if (remarkValue) {
                            remark1Element.value = `【客服備註】${remarkValue}\n\n${remark1Value}`.trim();
                        } else {
                            // 如果 `REMARK` 為空，則 `REMARK1` 只保留原本內容
                            remark1Element.value = remark1Value;
                        }
                    }

                    // 將 `REMARK1` 加入 XML
                    let finalRemark1Value = escapeXml(remark1Element.value.trim());
                    xmlContent += `  <fields>\n    <field_name>${id}</field_name>\n    <field_value>${finalRemark1Value}</field_value>\n  </fields>\n`;

                    return; // 避免 `headerFields.forEach` 繼續處理 `REMARK1`
                }

                // 將當前欄位加入 XML（使用 mapping）
                const xmlHeaderName = headerToXmlNameMap[id] || id;

                xmlContent +=
                    `  <fields>\n` +
                    `    <field_name>${xmlHeaderName}</field_name>\n` +
                    `    <field_value>${value}</field_value>\n` +
                    `  </fields>\n`;

            }
        });

        xmlContent += '  </head>\n<detail>\n  <detail_table_name>DI_INVBD</detail_table_name>\n';

        let itemCounter = 1; // 初始化計數參數
        document.querySelectorAll("#item-container .item-row").forEach((item) => {
            xmlContent += '  <items>\n';
            let itemNo = item.querySelector('.ITEM_NO').checked ? '*' : (itemCounter++).toString();

            xmlContent += `    <fields>\n      <field_name>ITEM_NO</field_name>\n      <field_value>${itemNo}</field_value>\n    </fields>\n`;

            itemFields.forEach(className => {
                let value;
                if (className === 'ISCALC_WT') {
                    value = item.querySelector(`.${className}`).checked ? 'Y' : '';
                } else {
                    value = item.querySelector(`.${className}`).value || '';
                    value = value.replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F\u200B-\u200F\u2028-\u202F\u2060-\u206F\uFEFF\uFFF9-\uFFFB\uFFFE\uFFFF]/g, '')
                        .replace(/[\u00A0]/g, ' ')
                        .trim();
                    value = escapeXml(value);

                    // 替換單位及稅則
                    value = replaceValue(className, value);

                    // 對 DESCRIPTION 欄位進行處理
                    if (className === 'DESCRIPTION') {
                        value = value.trim(); // 去除前後空格
                        value = value.replace(/ {10,}/g, '\n'); // 十個以上空格替換為換行
                        value = value.replace(/\n\s*\n/g, '\n'); // 移除多個連續的空行
                    }
                }

                const xmlTagName = itemToXmlNameMap[className] || className;  // ★ 使用 mapping

                xmlContent +=
                    `    <fields>\n` +
                    `      <field_name>${xmlTagName}</field_name>\n` +
                    `      <field_value>${value}</field_value>\n` +
                    `    </fields>\n`;
            });

            // 設定 PER_ST 的值
            let perStValue = (item.querySelector('.ITEM_NO').checked) ? '' : '1';
            xmlContent += `    <fields>\n      <field_name>PER_ST</field_name>\n      <field_value>${perStValue}</field_value>\n    </fields>\n`;

            xmlContent += '  </items>\n';
        });
        xmlContent += '</detail>\n</Root>';

        const fileName = document.getElementById('FILE_NO').value.trim();
        const exporterName = document.getElementById('SHPR_C_NAME').value.trim();

        let remarkElement = document.getElementById('REMARK')?.value.trim() || '';

        // ⭐ fallback 改強一點（重點）
        if (!remarkElement) {
            let remark1Raw = document.getElementById('REMARK1')?.value || '';
        
            // 移除整段【客服備註】開頭 + 換行
            remark1Raw = remark1Raw.replace(/^【客服備註】\s*/, '');
        
            // 只取第一行（避免整段帶進檔名）
            remarkElement = remark1Raw.split('\n')[0].trim();
        }
        
        // 組合備註內容
        let remarks = [];
        if (remarkElement) {
            remarks.push(remarkElement);
        }

        // 組合檔名
        let fullFileName = `${fileName}-${exporterName}`;
        if (remarks.length > 0) {
            fullFileName += `【${remarks.join('，')}】`; // 以 "，" 分隔多個備註
        }

        // 加上副檔名
        fullFileName += ".xml";

        const blob = new Blob([xmlContent], { type: 'application/xml' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = fullFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    window.exportToXML = exportToXML; // ✅ 這行很關鍵，先把函式掛到全域

    const btn = document.getElementById('export-to-xml');
    if (!btn) {
      console.warn('#export-to-xml not found on DOMContentLoaded');
    } else {
      // 避免重複綁定
      if (btn.dataset.boundExport !== '1') {
        btn.dataset.boundExport = '1';
    
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          window.exportToXML();
        }, true);
      }
    }
    
});

// 轉義 XML 保留字符的函數
function escapeXml(unsafe) {
    if (typeof unsafe !== 'string') {
        unsafe = String(unsafe);
    }
    return unsafe.replace(/[<>&'"]/g, function (match) {
        switch (match) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '"': return '&quot;';
            case "'": return '&apos;';
        }
    });
}

// 取消轉義 XML 保留字符的函數
function unescapeXml(escaped) {
    return escaped.replace(/&lt;|&gt;|&amp;|&quot;|&apos;/g, function (match) {
        switch (match) {
            case '&lt;': return '<';
            case '&gt;': return '>';
            case '&amp;': return '&';
            case '&quot;': return '"';
            case '&apos;': return "'";
        }
    });
}

// ===== 貿易條件提示（不擋匯出）=====
function showTermsSalesHints() {

    if (termsSalesHintShown) return;   // ⭐ 已提示過就不再跳

    const terms = document.getElementById('TERMS_SALES')?.value.trim().toUpperCase();
    if (!terms) return;

    const frt = document.getElementById('FRT_AMT')?.value.trim();
    const ins = document.getElementById('INS_AMT')?.value.trim();
    const add = document.getElementById('ADD_AMT')?.value.trim();

    const hints = [];

    if (terms === 'FOB' && !frt) hints.push('FOB：建議填列「運費」');
    if (terms === 'CFR' && !frt) hints.push('CFR：建議填列「運費」');

    if (terms === 'CIF') {
        if (!frt) hints.push('CIF：建議填列「運費」');
        if (!ins) hints.push('CIF：建議填列「保險費」');
    }

    if (terms === 'EXW') {
        if (!frt) hints.push('EXW：建議填列「運費」');
        if (!add) hints.push('EXW：建議填列「應加費用」');
    }

    if (hints.length > 0) {
        alert(`貿易條件提示（不影響匯出）：\n${hints.join('\n')}\n\n※ 若目前沒有數值，可暫時不填`);
        termsSalesHintShown = true;   // ⭐ 設為已提示
    }
}

// ===== 表頭：XML TAG → 系統欄位 ID =====
const xmlHeaderNameMap = {
    'DOC_HEAD_DOC_NO': 'FILE_NO',
    'P_DOC_ITEM_FRN': 'CAL_IP_TOT_ITEM_AMT',
    'COPY_NUM': 'COPY_QTY',
    'DOC_IMP_DATE': 'ARRIVAL_DATE',
    'DCL_DATE': 'ACCEPTANCE_DATE',
    'DOC_EXP_DATE': 'EXIT_DATE',
    'FLY_NO': 'JOURNEY_ID',          // 船舶航次/班機班次
    'FROM_CODE': 'LOADING_LOCATION', // 起運口岸(代碼)
    // 其他欄位名稱相同的就不用寫
};

// ===== 表頭：系統欄位 ID → XML TAG =====
const headerToXmlNameMap = {
    CAL_IP_TOT_ITEM_AMT: 'P_DOC_ITEM_FRN',
    COPY_QTY: 'COPY_NUM',
    ARRIVAL_DATE: 'DOC_IMP_DATE',
    ACCEPTANCE_DATE: 'DCL_DATE',
    EXIT_DATE: 'DOC_EXP_DATE',
    JOURNEY_ID: 'FLY_NO',
    LOADING_LOCATION: 'FROM_CODE',
    // FILE_NO 用原本的特例處理成 DOC_HEAD_DOC_NO
};

// ===== 項次：XML TAG → 系統 className =====
const xmlItemNameMap = {
    'GOODS_BRAND': 'TRADE_MARK',
    'TAX_RATE_P': 'TAX_RATE',
    'TAX_METHOD': 'ST_MTD',
    'SUB_CCC_CODE': 'TARIFF_CODE',
    'ORIGIN_CERTIFICATE_NO': 'CERT_NO',
    'ORIGIN_CERTIFICATE_ITEM': 'CERT_NO_ITEM',
    'org_EXP_DCL_NO': 'ORG_IMP_DCL_NO',
    'org_EXP_DCL_ITEM': 'ORG_IMP_DCL_NO_ITEM',
    'BUYER_ITEM_CODE': 'SELLER_ITEM_CODE',
};

// ===== 項次：系統 className → XML TAG =====
const itemToXmlNameMap = {
    TRADE_MARK: 'GOODS_BRAND',
    TAX_RATE: 'TAX_RATE_P',
    ST_MTD: 'TAX_METHOD',
    TARIFF_CODE: 'SUB_CCC_CODE',
    CERT_NO: 'ORIGIN_CERTIFICATE_NO',
    CERT_NO_ITEM: 'ORIGIN_CERTIFICATE_ITEM',
    ORG_IMP_DCL_NO: 'org_EXP_DCL_NO',
    ORG_IMP_DCL_NO_ITEM: 'org_EXP_DCL_ITEM',
    SELLER_ITEM_CODE: 'BUYER_ITEM_CODE',

};

// 全域變數 記錄是否提示過貿易條件
let termsSalesHintShown = false;











