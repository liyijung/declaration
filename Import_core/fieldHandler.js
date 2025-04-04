// 開啟指定填列欄位資料的彈跳框
function openSpecifyFieldModal() {
    // 顯示彈跳框
    const specifyFieldModal = document.getElementById('specify-field-modal');
    specifyFieldModal.style.display = 'flex';

    // 設置焦點 source-item-number (從源項次複製內容-源項次)
    const itemNumbersInput = document.getElementById('source-item-number');
    itemNumbersInput.focus();
    
    // 允許點擊背後的頁面欄位
    specifyFieldModal.style.pointerEvents = 'none';
    specifyFieldModal.children[0].style.pointerEvents = 'auto'; // 只允許彈跳框內部的第一個子元素接收點擊

    // 檢查是否顯示 "起始編號" 或 "填列內容"
    checkFieldDisplay();

    // 更新源項次下拉選單
    populateSourceItemDropdown();

    // 監聽 ESC 鍵，表示取消
    document.addEventListener('keydown', handleEscKeyForSpecifyFieldCancel);
}

// 處理 ESC 鍵關閉彈跳框
function handleEscKeyForSpecifyFieldCancel(event) {
    if (event.key === 'Escape') {
        closeSpecifyFieldModal();
    }
}

// 關閉指定填列欄位資料的彈跳框
function closeSpecifyFieldModal() {
    const specifyFieldModal = document.getElementById('specify-field-modal');
    specifyFieldModal.style.display = 'none'; // 隱藏彈跳框

    // 清除原欄位輸入框的文字
    const originalFieldInput = document.getElementById('original-field-input');
    if (originalFieldInput) {
        originalFieldInput.value = '';
    }

    // 移除 ESC 事件監聽
    document.removeEventListener('keydown', handleEscKeyForSpecifyFieldCancel);

    // 重置模式為 'copy'
    document.getElementById('specify-mode').value = 'copy';
    toggleSpecifyMode(); // 確保 UI 恢復成 copy-content
}

// 動態生成源項次下拉選單的選項
function populateSourceItemDropdown() {
    const sourceItemSelect = document.getElementById('source-item-number');
    sourceItemSelect.innerHTML = '<option value="">選擇項次 No.</option>';
    document.querySelectorAll('#item-container .item-row').forEach((item, index) => {
        const description = item.querySelector('.DESCRIPTION').value;
        sourceItemSelect.innerHTML += `<option value="${index + 1}">${index + 1} - 品名: ${description}</option>`;
    });
}

// 切換模式
function toggleSpecifyMode() {
    const specifyMode = document.getElementById('specify-mode').value;
    const customContent = document.getElementById('custom-content');
    const copyContent = document.getElementById('copy-content');
    const overwriteOption = document.getElementById('overwrite-option');
    const fieldName = document.getElementById('specify-field-name').value;
    
    const conditionOption = overwriteOption.querySelector('option[value="condition"]'); // ← 這一行必加！
    const optionsToHide = overwriteOption.querySelectorAll('option[value="matchCondition"], option[value="notMatchCondition"]');

    if (specifyMode === 'copy') {
        customContent.style.display = 'none';
        copyContent.style.display = 'block';

        // ❌ 隱藏條件判斷選項
        if (conditionOption) conditionOption.style.display = 'none';

        // 若目前選的是條件判斷，強制切回 "全部覆蓋"
        if (overwriteOption.value === 'condition') {
            overwriteOption.value = 'all';
        }
    } else {
        customContent.style.display = 'block';
        copyContent.style.display = 'none';

        // ✅ 顯示條件判斷選項
        if (conditionOption) conditionOption.style.display = 'block';

        if (fieldName === 'DESCRIPTION') {
            optionsToHide.forEach(option => option.style.display = 'none');
        } else {
            // 顯示「條件判斷」選項
            optionsToHide.forEach(option => option.style.display = 'block');
        }

        // 設置焦點 specify-field-value (自定義填列內容-填列內容)
        setTimeout(() => {
            const itemNumbersInput = document.getElementById('specify-field-value');
            if (itemNumbersInput) {
                itemNumbersInput.focus();
            }
        }, 0);
    }

    updateConditionRowDisplay(); // ← 確保條件列同步顯示
}

// 當指定的欄位變更時檢查是否顯示起始編號輸入框和填列內容
function checkFieldDisplay() {
    const fieldName = document.getElementById('specify-field-name').value;
    const startNumberContainer = document.getElementById('start-number-container');
    const specifyFieldValue = document.getElementById('specify-field-value');
    specifyFieldValue.value = '';  // 清除填列內容的文字

    if (fieldName === 'CERT_NO_ITEM') {
        startNumberContainer.style.display = 'inline-block';
        specifyFieldValue.style.display = 'none';  // 隱藏填列內容

        // 設置焦點 specify-item-number (自定義填列內容-No.)
        setTimeout(() => {
            const itemNumbersInput = document.getElementById('specify-item-numbers');
            if (itemNumbersInput) {
                itemNumbersInput.focus();
            }
        }, 0);
    } else {
        startNumberContainer.style.display = 'none';
        specifyFieldValue.style.display = 'block';  // 顯示填列內容
    }

    // 動態調整 rows 屬性
    if (fieldName === 'DESCRIPTION') {
        specifyFieldValue.rows = 5;
        specifyFieldValue.removeEventListener('keydown', preventEnterKey); // 允許換行
    } else {
        specifyFieldValue.rows = 1;
        specifyFieldValue.addEventListener('keydown', preventEnterKey); // 阻止換行
    }
}

// 阻止 textarea 按 Enter 鍵換行
function preventEnterKey(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
}

document.addEventListener('DOMContentLoaded', function () {
    // 設定一般預設模式為 'copy'
    document.getElementById('specify-mode').value = 'copy';
    toggleSpecifyMode(); // 觸發切換模式，確保預設顯示 copy-content
    
    document.querySelectorAll('.item-header .form-group').forEach(header => {
        header.addEventListener('click', function () {
            // 取得 `specify-field-name` 下拉選單
            const specifyFieldName = document.getElementById('specify-field-name');
            if (!specifyFieldName) return;

            // 取得當前表頭的所有 class
            let selectedField = null;
            this.classList.forEach(className => {
                // 檢查 `specify-field-name` 下拉選單是否包含該 class
                for (let i = 0; i < specifyFieldName.options.length; i++) {
                    if (specifyFieldName.options[i].value === className.toUpperCase()) {
                        selectedField = className.toUpperCase();
                        break;
                    }
                }
                if (selectedField) return;
            });

            // 如果沒有對應欄位，不開啟彈跳框
            if (!selectedField) return;

            // 設定彈跳框的欄位名稱
            specifyFieldName.value = selectedField;

            // 點擊表頭時，將模式切換為 'custom'
            document.getElementById('specify-mode').value = 'custom';
            toggleSpecifyMode(); // 觸發模式切換

            // 開啟彈跳框
            openSpecifyFieldModal();
        });
    });
});

// 是否顯示「條件欄位」輸入框
function updateConditionRowDisplay() {
    const mode = document.getElementById('specify-mode').value;
    const overwrite = document.getElementById('overwrite-option').value;
    const conditionRow = document.getElementById('condition-row');

    if (mode === 'custom' && overwrite === 'condition') {
        conditionRow.style.display = 'flex';
    } else {
        conditionRow.style.display = 'none';
    }
}

// 切換模式時也要重新判斷
document.getElementById('specify-mode').addEventListener('change', updateConditionRowDisplay);
document.getElementById('overwrite-option').addEventListener('change', updateConditionRowDisplay);


document.getElementById('specify-field-name').addEventListener('change', toggleSpecifyMode);
document.getElementById('specify-field-name').addEventListener('change', checkFieldDisplay);

// 應用填列資料的函數
function applyFieldData() {
    const mode = document.getElementById('specify-mode').value;
    const overwriteOption = document.getElementById('overwrite-option').value;
    
    // 當覆蓋選項為「條件欄位」時，檢查原欄位輸入框是否有值
    if (overwriteOption === 'matchCondition' || overwriteOption === 'notMatchCondition') {
        const originalField = document.getElementById('original-field-input').value.trim();
        if (originalField === '') {
            alert('請輸入「條件：原欄位」的值');
            return; // 中止執行
        }
    }

    const itemContainer = document.getElementById('item-container');
    const items = itemContainer.querySelectorAll('.item-row');
    let hasUpdatedCCCCode = false; // 紀錄是否有更新CCC_CODE欄位
    let hasUpdatedQtyOrUnitPrice = false; // 紀錄是否有更新QTY、DOC_UM、DOC_UNIT_P欄位
    let hasUpdatedCertNoOrCertNoItem = false; // 紀錄是否有更新CERT_NO、CERT_NO_ITEM欄位

    // 需要強制轉為大寫的欄位
    const upperCaseFields = [
        "DOC_UM", "ST_MTD", "ORG_COUNTRY", "ORG_IMP_DCL_NO", "BOND_NOTE", 
        "CERT_NO", "EXP_NO", "WIDE_UM", "LENGTH_UM"
    ];

    // 讀取原欄位內容（僅在符合條件、不符合條件時使用）
    let originalField = '';
    if (overwriteOption === 'matchCondition' || overwriteOption === 'notMatchCondition') {
        originalField = document.getElementById('original-field-input').value;
    }

    if (mode === 'custom') {
        const itemNumbers = document.getElementById('specify-item-numbers').value.trim();
        const fieldName = document.getElementById('specify-field-name').value;
        let fieldValue = document.getElementById('specify-field-value').value;

        // 如果欄位名稱是 CCC_CODE，對填列值進行 replaceValue 處理
        if (fieldName === 'CCC_CODE') {
            fieldValue = replaceValue('CCC_CODE', fieldValue);
        }
        
        // 如果 specify-field-value 以 "=" 開頭，則複製指定欄位的值
        let copyFieldName = null;
        if (fieldValue.startsWith("=")) {
            const labelText = fieldValue.substring(1).trim(); // 取得中文欄位名稱
            copyFieldName = getOptionValueByLabel(labelText); // 轉換為對應的英文 value

            if (!copyFieldName) {
                console.warn("無法找到對應的欄位名稱:", labelText);
            }
        }

        // 透過中文名稱查找對應的 option value
        function getOptionValueByLabel(labelText) {
            const selectElement = document.getElementById('specify-field-name');
            if (!selectElement) {
                console.error("找不到指定的下拉選單元素: #specify-field-name");
                return null;
            }

            const options = selectElement.options;
            for (let i = 0; i < options.length; i++) {
                if (options[i].textContent.trim() === labelText.trim()) {
                    return options[i].value; // 找到對應的 value
                }
            }
            console.warn(`無法找到對應的欄位名稱: ${labelText}`);
            return null; // 找不到對應的值時回傳 null
        }

        // 排除 DESCRIPTION 欄位的 trim
        if (fieldName !== 'DESCRIPTION') {
            fieldValue = fieldValue.trim();
        }

        // 如果欄位在指定的 upperCaseFields 清單內，則轉換為大寫
        if (upperCaseFields.includes(fieldName)) {
            fieldValue = fieldValue.toUpperCase();
        }

        const startNumber = parseInt(document.getElementById('start-number').value, 10); // 起始編號
        let currentNumber = startNumber; // 當前編號

        let indices = [];

        // 如果 specify-item-numbers 為空，則表示全部項次
        if (itemNumbers.trim() === "") {
            for (let i = 0; i < items.length; i++) {
                indices.push(i);
            }
        } else {
            const ranges = itemNumbers.split(',').map(range => range.trim());
            ranges.forEach(range => {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(Number);
                    for (let i = start; i <= end; i++) {
                        indices.push(i - 1);
                    }
                } else {
                    indices.push(Number(range) - 1);
                }
            });
        }

        indices.forEach(index => {
            if (index >= 0 && index < items.length) {
                const item = items[index];

                // 檢查此列的 item-number 欄位
                const itemNumberElem = item.querySelector('.item-number label');
                if (itemNumberElem && itemNumberElem.textContent.trim() === "*") {
                    // 若 item-number 為 "*"，則清空該列指定欄位的值，並略過更新
                    const fieldElement = item.querySelector(`.${fieldName}`);
                    if (fieldElement && fieldName !== 'DESCRIPTION') {
                        fieldElement.value = "";
                    }
                    return; // 跳過此列後續更新
                }

                const fieldElement = item.querySelector(`.${fieldName}`);

                // 若指定了複製欄位，則從該列對應欄位獲取值
                if (copyFieldName) {
                    const copyFieldElement = item.querySelector(`.${copyFieldName}`);
                    if (copyFieldElement) {
                        fieldValue = copyFieldElement.value; // 複製對應欄位的值
                    }
                }

                // 取得條件判斷相關欄位
                const conditionEnabled = overwriteOption === 'condition';
                const conditionFieldName = document.getElementById('original-field-name')?.value || '';
                const conditionType = document.getElementById('condition-type')?.value || 'equals';
                const conditionValueInput = document.getElementById('original-field-input')?.value || '';

                // 判斷是否符合條件
                let conditionPassed = true;
                if (conditionEnabled) {
                    const conditionElem = item.querySelector(`.${conditionFieldName}`);
                    const fieldValue = conditionElem ? conditionElem.value : '';
                    const inputVal = conditionValueInput.trim();

                    switch (conditionType) {
                        case 'equals':
                            conditionPassed = fieldValue === inputVal;
                            break;
                        case 'notEquals':
                            conditionPassed = fieldValue !== inputVal;
                            break;
                        case 'greaterThan':
                            conditionPassed = parseFloat(fieldValue) > parseFloat(inputVal);
                            break;
                        case 'lessThan':
                            conditionPassed = parseFloat(fieldValue) < parseFloat(inputVal);
                            break;
                        case 'startsWith':
                            conditionPassed = fieldValue.startsWith(inputVal);
                            break;
                        case 'endsWith':
                            conditionPassed = fieldValue.endsWith(inputVal);
                            break;
                        case 'includes':
                            conditionPassed = fieldValue.includes(inputVal);
                            break;
                        case 'notIncludes':
                            conditionPassed = !fieldValue.includes(inputVal);
                            break;
                        default:
                            conditionPassed = true;
                    }
                }
                
                // 判斷覆蓋條件
                if (
                    overwriteOption === 'all' ||
                    (overwriteOption === 'empty' && !fieldElement.value) ||
                    (overwriteOption === 'specified' && fieldElement.value) ||
                    (overwriteOption === 'condition' && conditionPassed)
                ) {
                    // 如果選擇的是產證序號，則填入指定的編號
                    if (fieldName === 'CERT_NO_ITEM') {
                        fieldElement.value = `${currentNumber}`; // 填入指定的編號
                        currentNumber++; // 編號遞增
                    } else {
                        fieldElement.value = fieldValue;
                    }
                    // 紀錄是否更新了CCC_CODE
                    if (fieldName === 'CCC_CODE') {
                        hasUpdatedCCCCode = true;
                    }

                    // 紀錄是否更新了QTY、DOC_UM、DOC_UNIT_P
                    if (["QTY", "DOC_UM", "DOC_UNIT_P"].includes(fieldName)) {
                        hasUpdatedQtyOrUnitPrice = true;
                    }

                    // 紀錄是否更新了CERT_NO、CERT_NO_ITEM
                    if (["CERT_NO", "CERT_NO_ITEM"].includes(fieldName)) {
                        hasUpdatedCertNoOrCertNoItem = true;
                    }
                }
            }
        });
    } else if (mode === 'copy') {
        const sourceItemNumber = document.getElementById('source-item-number').value;
        const fieldNames = Array.from(document.getElementById('specify-field-names-copy').selectedOptions).map(option => option.value);
        const targetItemNumbers = document.getElementById('target-item-numbers').value.trim();
        const sourceIndex = parseInt(sourceItemNumber, 10) - 1;

        let targetIndices = [];

        // 如果 target-item-numbers 為空，表示全部項次
        if (targetItemNumbers === "") {
            for (let i = 0; i < items.length; i++) {
                targetIndices.push(i);
            }
        } else {
            const ranges = targetItemNumbers.split(',').map(range => range.trim());
            ranges.forEach(range => {
                if (range.includes('-')) {
                    const [start, end] = range.split('-').map(Number);
                    for (let i = start; i <= end; i++) {
                        targetIndices.push(i - 1);
                    }
                } else {
                    targetIndices.push(Number(range) - 1);
                }
            });
        }
        
        if (sourceIndex >= 0 && sourceIndex < items.length) {
            const sourceItem = items[sourceIndex];

            targetIndices.forEach(index => {
                if (index >= 0 && index < items.length) {
                    const targetItem = items[index];
                    // 檢查此列的 item-number 欄位
                    const itemNumberElem = targetItem.querySelector('.item-number label');
                    if (itemNumberElem && itemNumberElem.textContent.trim() === "*") {
                        // 若 item-number 為 "*"，則清空該列所有相關欄位，並略過更新此列
                        fieldNames.forEach(fieldName => {
                            const targetFieldElement = targetItem.querySelector(`.${fieldName}`);
                            if (targetFieldElement && fieldName !== 'DESCRIPTION') {
                                targetFieldElement.value = "";
                            }
                        });
                        return; // 跳過此列後續更新
                    }

                    fieldNames.forEach(fieldName => {
                        const sourceFieldElement = sourceItem.querySelector(`.${fieldName}`);
                        const targetFieldElement = targetItem.querySelector(`.${fieldName}`);

                        // 判斷覆蓋條件
                        if (
                            overwriteOption === 'all' ||
                            (overwriteOption === 'empty' && !targetFieldElement.value) ||
                            (overwriteOption === 'specified' && targetFieldElement.value) ||
                            (overwriteOption === 'matchCondition' && targetFieldElement.value.includes(originalField)) ||
                            (overwriteOption === 'notMatchCondition' && !targetFieldElement.value.includes(originalField))
                        ) {
                            targetFieldElement.value = sourceFieldElement.value;
                        }
                        // 紀錄是否更新了CCC_CODE
                        if (fieldName === 'CCC_CODE') {
                            hasUpdatedCCCCode = true;
                        }
                        // 紀錄是否更新了QTY、DOC_UM、DOC_UNIT_P
                        if (["QTY", "DOC_UM", "DOC_UNIT_P"].includes(fieldName)) {
                            hasUpdatedQtyOrUnitPrice = true;
                        }
                        // 紀錄是否更新了CERT_NO、CERT_NO_ITEM
                        if (["CERT_NO", "CERT_NO_ITEM"].includes(fieldName)) {
                            hasUpdatedCertNoOrCertNoItem = true;
                        }
                    });
                }
            });
        }
    }
    
    // 檢查是否有更新CCC_CODE欄位，若有則對所有更新的CCC_CODE欄位執行handleCCCCodeInput
    if (hasUpdatedCCCCode) {
        items.forEach(item => {
            const cccCodeInput = item.querySelector('.CCC_CODE');
            if (cccCodeInput) {
                handleCCCCodeInput(null, cccCodeInput); // 最後執行處理CCC_CODE欄位的邏輯
            }
        });
    }

    const decimalPlacesInput = document.getElementById('decimal-places');
    let decimalPlaces = parseInt(decimalPlacesInput.value);
    
    // 確保小數點位數最小為0，並預設為2
    if (isNaN(decimalPlaces) || decimalPlaces < 0) {
        decimalPlaces = 2;
    }
    
    // 檢查是否有更新QTY、DOC_UM、DOC_UNIT_P欄位，若有則對所有更新的欄位執行金額計算及更新ST_QTY、NET_WT
    if (hasUpdatedQtyOrUnitPrice) {
        items.forEach(item => {
            calculateAmountsForRow(item, decimalPlaces);
            updateST_QTY(item);
            updateNET_WT(item);
        });
    }
    // 檢查是否有更新CERT_NO、CERT_NO_ITEM欄位，若有則對所有更新的欄位執行自動填入稅則附碼為 'PT'
    if (hasUpdatedCertNoOrCertNoItem) {
        items.forEach(item => {
            checkFields(item)

            const cccInput = item.querySelector('.CCC_CODE');
            if (cccInput) {
                const cleanedCode = cccInput.value.trim().replace(/[.\-\s]/g, '');
                updateTariff(cccInput, cleanedCode);
            }
        });
    }

    closeSpecifyFieldModal();
}

// 監聽產證號碼和產證項次的變動
document.getElementById('CERT_NO').addEventListener('input', checkFields);
document.getElementById('CERT_NO_ITEM').addEventListener('input', checkFields);

// 監聽所有項次的產證號碼和產證項次變動
document.addEventListener('input', function(event) {
    if (event.target.matches('.CERT_NO, .CERT_NO_ITEM')) {
        checkFields(event.target); // 只監聽 CERT_NO 或 CERT_NO_ITEM 的變動
    }
});

// 檢查產證號碼和產證項次的欄位變動
function checkFields(inputElement) {
    // 確保 inputElement 是有效的 DOM 元素
    if (!(inputElement instanceof HTMLElement)) {
        return;
    }

    // 檢查 inputElement 是否有 .closest 方法
    if (!inputElement.closest) {
        return;
    }

    const itemRow = inputElement.closest('.item-row');  // 獲取對應的項次行

    if (!itemRow) {
        // 若是新增項次的 CERT_NO 和 CERT_NO_ITEM 欄位
        const certNo = document.getElementById('CERT_NO').value;
        const certNoItem = document.getElementById('CERT_NO_ITEM').value;
        // 如果產證號碼和產證項次都有值，則自動填入稅則附碼為 'PT'
        if (certNo && certNoItem) {
            document.getElementById('TARIFF_CODE').value = 'PT';
            document.getElementById('TAX_RATE').value = '0';
        } else {
            document.getElementById('TARIFF_CODE').value = ''; // 如果任一欄位沒填寫，清空稅則附碼
        }
    } else {
        // 若是每個項次的 CERT_NO 和 CERT_NO_ITEM 欄位
        const certNo = itemRow.querySelector('.CERT_NO').value; // 取得該項次的產證號碼
        const certNoItem = itemRow.querySelector('.CERT_NO_ITEM').value; // 取得該項次的產證項次
        const tariffCodeElement = itemRow.querySelector('.TARIFF_CODE'); // 取得該項次的稅則附碼
        const taxRateElement = itemRow.querySelector('.TAX_RATE'); // 取得該項次的 TAX_RATE 欄位

        // 如果產證號碼和產證項次都有值，則自動填入稅則附碼為 'PT'
        if (certNo && certNoItem) {
            tariffCodeElement.value = 'PT';
            taxRateElement.value = '0'; // 設定 TAX_RATE 為 0%
        } else {
            tariffCodeElement.value = ''; // 如果任一欄位沒填寫，清空稅則附碼
        }
    }
}

// 彈跳框內循環 Tab
document.addEventListener("DOMContentLoaded", function () {
    const modal = document.getElementById("specify-field-modal");
    
    modal.addEventListener("keydown", function (event) {
        if (event.key === "Tab") {
            let focusableElements = modal.querySelectorAll('input, select, textarea, button');
            focusableElements = Array.prototype.slice.call(focusableElements);
            
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            if (event.shiftKey) { // Shift + Tab
                if (document.activeElement === firstElement) {
                    lastElement.focus();
                    event.preventDefault();
                }
            } else { // Tab
                if (document.activeElement === lastElement) {
                    firstElement.focus();
                    event.preventDefault();
                }
            }
        }
    });
});
