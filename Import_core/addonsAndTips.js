// 添加錯誤樣式
function setError(element, message) {
    element.classList.add('error');
    element.title = message; // 顯示提示訊息
}

// 清除錯誤樣式
function clearErrors() {
    document.querySelectorAll('.error').forEach(el => {
        el.classList.remove('error');
        el.removeAttribute('title');
    });
}

// 執行納稅辦法連號檢查
function validateDclDocType() {
    clearErrors(); // 清除之前的錯誤標記
    const dclDocType = document.getElementById('DCL_DOC_TYPE').value.trim().toUpperCase();
    let validationErrors = new Set(); // 錯誤訊息，使用 Set 儲存錯誤訊息，避免重複
    let validationWarnings = new Set(); // 提示訊息（不影響匯出）

    const stMtdGroups = {}; // 用來儲存納稅辦法的連號分組

    const validStMtdValues = new Set([
        "31", "32", "33", "34", "35", "36", "37", "38", "39", "3A", "3B", "3E", "3F", "3K", "3L", "3M", "3R", "3V",
        "41", "42", "49", "50", "51", "52", "53", "54", "55", "56", "57", "58", "59", "5A", "5B", "5C", "5D", "5E",
        "5F", "5G", "5H", "5J", "5K", "5L", "5M", "5N", "5P", "5Q", "5R", "5S", "5T", "5U", "5W", "5X", "5Y", "5Z",
        "61", "62", "63", "64", "65", "66", "67", "68", "69", "70", "71", "72", "73", "74", "75", "79",
        "90", "91", "92", "93", "94", "95", "97", "98", "99", "9A", "9B", "9C", "9D", "9E", "9F", "9G",
        "EF", "FB"
    ]);

    const rows = document.querySelectorAll("#item-container .item-row");
    rows.forEach(item => {
        const itemNo = item.querySelector(".item-number label")?.textContent.trim();
        if (itemNo === "*") return; // 忽略 ITEM_NO 為 "*" 的項次

        const stMtdValue = item.querySelector(".ST_MTD")?.value.trim().toUpperCase();

        if (stMtdValue && !validStMtdValues.has(stMtdValue)) {
            validationErrors.add(`無納稅辦法「${stMtdValue}」`);
            setError(item.querySelector(".ST_MTD"), `無此納稅辦法`);
        }

        // 納稅辦法連號檢查
        if (stMtdValue) {
            const match = stMtdValue.match(/^(\d+)([A-Z]?)$/);
            if (match) {
                const numPart = parseInt(match[1], 10);
                const letterPart = match[2] || "";
                if (!stMtdGroups[letterPart]) {
                    stMtdGroups[letterPart] = [];
                }
                stMtdGroups[letterPart].push(numPart);
            }
        }
    });

    Object.entries(stMtdGroups).forEach(([letter, numbers]) => {
        if (numbers.length > 1) {
            let tempSequence = [numbers[0]];
            let resultSequences = [];

            numbers.sort((a, b) => a - b); // 先排序

            for (let i = 1; i < numbers.length; i++) {
                const current = numbers[i];
                const prev = tempSequence[tempSequence.length - 1];

                if (current === prev || current === prev + 1) {
                    if (current !== prev) {
                        tempSequence.push(current);
                    }
                } else {
                    if (tempSequence.length >= 2) {
                        resultSequences.push([...tempSequence]);
                    }
                    tempSequence = [current];
                }
            }

            if (tempSequence.length >= 2) {
                resultSequences.push([...tempSequence]);
            }

            resultSequences.forEach(seq => {
                const combinedValues = seq
                    .map(n => (letter === "" ? n.toString().padStart(2, '0') : n.toString()) + letter)
                    .join(", ");
                validationWarnings.add(`※ 納稅辦法連號：${combinedValues}`);
            });
        }
    });

    // 檢查納稅辦法、生產國別、報單類別
    let allOrgCountryTW = true;
    let totalValidRows = 0;

    rows.forEach(item => {
        const isItemChecked = item.querySelector(".ITEM_NO")?.checked;
        if (isItemChecked) return;

        const stMtd = item.querySelector(".ST_MTD")?.value.trim();
        const orgCountry = item.querySelector(".ORG_COUNTRY")?.value.trim().toUpperCase();

        if (orgCountry) {
            totalValidRows++;
    
            // 報單類別為 G7 且納稅辦法為 55 或 99 時，生產國別必須為 TW
            if (dclDocType === "G7" && (stMtd === "55" || stMtd === "99")) {
                if (orgCountry !== "TW") {
                    validationErrors.add("納稅辦法為 55 或 99，生產國別必須為 TW");
                    setError(item.querySelector(".ST_MTD"), "納稅辦法為 55 或 99，生產國別必須為 TW");
                    setError(item.querySelector(".ORG_COUNTRY"), "生產國別必須為 TW");
                }
            }
    
            // 累計是否每一筆都是 TW
            if (orgCountry !== "TW") {
                allOrgCountryTW = false;
            }
        }
    });

    // 如果全部都是 TW，但報單類別不是 G7，則錯誤
    if (totalValidRows > 0 && allOrgCountryTW && dclDocType !== "G7") {
        validationErrors.add("全部項次生產國別皆為 TW，報單類別應為 G7");
        setError(document.getElementById("DCL_DOC_TYPE"), "應為 G7（國貨復進口）");
    }

    // 提示與警告
    if (validationErrors.size > 0 || validationWarnings.size > 0) {
        const messages = [];
        if (validationErrors.size > 0) {
            messages.push("❌ 錯誤：\n" + Array.from(validationErrors).join("\n"));
        }
        if (validationWarnings.size > 0) {
            messages.push("⚠️ 提示（不中止匯出）：\n" + Array.from(validationWarnings).join("\n"));
        }
        alert(messages.join("\n\n"));
        return validationErrors.size === 0;
    }

    return true; // 無錯誤，允許繼續處理
}

// 長期委任字號：
const excelFilePath = './Import_format/進口長委登記表.xlsx';

function fetchAndParseExcel(callback) {
    fetch(excelFilePath)
        .then(response => {
            if (!response.ok) throw new Error('無法讀取進口長委登記表');
            return response.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            callback(rows);
        })
        .catch(error => {
            console.error('讀取進口長委登記表時發生錯誤:', error);
            alert('讀取進口長委登記表失敗');
        });
}

function parseCustomDate(dateString) {
    // 將日期格式 "118.01.30" 轉換為標準日期格式
    const [year, month, day] = dateString.split('.');
    if (!year || !month || !day) return null;

    // 將 "民國" 年份轉換為西元年份
    const fullYear = parseInt(year, 10) + 1911;
    return new Date(`${fullYear}-${month}-${day}`);
}

function handleCheck() {
    const SHPR_BAN_ID = document.getElementById('SHPR_BAN_ID').value.trim();
    const docOtrDesc = document.getElementById('DOC_OTR_DESC');

    // 僅移除以 "長期委任字號" 開頭的行，保留其他內容
    docOtrDesc.value = docOtrDesc.value.replace(/^長期委任字號：.*$/gm, '').trim();

    fetchAndParseExcel(rows => {
        const today = new Date();
        const validEntries = [];

        // 遍歷 rows，收集所有未逾期且符合條件的資料
        rows.forEach(row => {
            const id = row[1] ? row[1].toString() : null;
            const expiryDate = row[3] ? parseCustomDate(row[3]) : null;

            // 確保 ID 符合且到期日不早於今天
            if (id === SHPR_BAN_ID && expiryDate && expiryDate >= today) {
                validEntries.push(`長期委任字號：${row[2]}至${row[3]}`);
            }
        });

        if (validEntries.length > 0) {
            // 合併所有未逾期的項目，保留其他原內容
            /* // 原本會寫入 DOC_OTR_DESC
            const newContent = validEntries.join('\n');
            docOtrDesc.value = docOtrDesc.value
                ? `${docOtrDesc.value}\n${newContent}`
                : newContent;
            */
            document.getElementById('longTermLabel').style.display = 'inline';
        }

        if (validEntries.length === 0) {
            document.getElementById('longTermLabel').style.display = 'none';
        }        
    });
};

// 綁定輸入框事件
document.getElementById('SHPR_BAN_ID').addEventListener('input', handleCheck);

// 綁定按鍵事件
document.getElementById('checkBtn').addEventListener('click', handleCheck);

// 進口備註
const thingsToNoteExcelFilePath = './Import_format/thingsToNote.xlsx';

function thingsToNoteExcel(callback) {
    fetch(thingsToNoteExcelFilePath)
        .then(response => {
            if (!response.ok) throw new Error('無法讀取進口備註');
            return response.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
            callback(rows);
        })
        .catch(error => {
            console.error('讀取進口備註時發生錯誤:', error);
            alert('讀取進口備註失敗');
        });
}

function thingsToNote() {
    const SHPR_BAN_ID = document.getElementById('SHPR_BAN_ID').value.trim();
    const remark1Element = document.getElementById('REMARK1');

    if (remark1Element) {
        try {
            // 取得目前的內容，按行分割
            const lines = remark1Element.value.split('\n');
            
            // 指定允許的字串
            const allowedPrefixes = [
                '申請進口A式證明用聯',
                '申請進口B式證明用聯',
                '申請進口C式證明用聯',
                '申請沖退原料稅用聯',
                '申請沖退原料稅(E化退稅)',
                '申請其他聯'
            ];
            
            // 過濾每行內容，只保留符合允許的行
            const filteredLines = lines.filter(line => 
                allowedPrefixes.some(prefix => line.trim().startsWith(prefix))
            );
            
            // 將過濾後的內容重新組合回文字框
            remark1Element.value = filteredLines.join('\n');
        } catch (error) {
            console.error('處理REMARKS內容時發生錯誤：', error);
        }
    }
    
    thingsToNoteExcel(rows => {
        const validEntries = [];

        // 遍歷 rows，收集所有未逾期且符合條件的資料
        rows.forEach(row => {
            const id = row[1] ? row[1].toString() : null;

            if (id === SHPR_BAN_ID) {
                validEntries.push(`${row[2]}`);
            }
        });

        if (validEntries.length > 0) {
            // 合併所有內容
            const newContent = validEntries.join('\n');
            const finalContent = `${newContent}`;

            // 將進口備註內容加到 REMARK1 欄位最前面，避免重複
            if (remark1Element) {
                // 取得目前 REMARK1 的內容
                const currentContent = remark1Element.value.trim();

                // 標準化行內容以避免因格式問題產生重複
                const normalizeContent = (content) => {
                    return content
                        .split('\n') // 按行分割
                        .map(line => line.trim()) // 去除每行的多餘空白
                        .join('\n'); // 重新合併為字串
                };

                const normalizedFinalContent = normalizeContent(finalContent);
                const normalizedCurrentContent = normalizeContent(currentContent);

                // 檢查內容是否已包含欲加入的備註
                const newEntry = `【進口備註】\n${normalizedFinalContent}`;
                if (!normalizedCurrentContent.includes(normalizedFinalContent)) {
                    // 若 REMARK1 未包含相同內容，才進行追加
                    remark1Element.value = `${newEntry}\n${currentContent}`;
                }
            }

            // 顯示彈跳框
            closeExistingPopup();
            showPopup(finalContent);
        } else {
            // 如果沒有符合條件的備註，則關閉彈跳框
            closeExistingPopup();
        }
    });
};

document.addEventListener('keydown', function (event) {
    if (event.altKey && event.key.toLowerCase() === 'r') { //忽略大小寫
        event.preventDefault(); // 防止預設行為
        thingsToNote();
    }
});

function closeExistingPopup() {
    const existingPopup = document.querySelector('.popup');
    if (existingPopup) {
        existingPopup.remove();
    }
}

function showPopup(content) {
    // 創建彈跳框元素
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.style.position = 'fixed';
    popup.style.top = '50%';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%, -50%)';
    popup.style.padding = '10px';
    popup.style.backgroundColor = '#fef5f5'; // 背景色設置
    popup.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    popup.style.zIndex = '1000';
    popup.style.whiteSpace = 'pre-line'; // 保留換行
    popup.style.border = '5px solid #f5c2c2'; // 添加邊框
    popup.style.borderRadius = '5px'; // 邊角圓滑
    popup.style.fontSize = '16px'; // 字體大小
    popup.style.lineHeight = '1.6'; // 調整行距
    popup.style.minWidth = '400px'; // 設定最小寬度

    let isDragging = false;
    let offsetX, offsetY;

    const header = document.createElement('div');
    header.style.cursor = 'move'; // 設置可拖動光標
    header.textContent = '【進口備註】';
    popup.appendChild(header);

    header.addEventListener('mousedown', (e) => {
        isDragging = true;
        offsetX = e.clientX - popup.getBoundingClientRect().left;
        offsetY = e.clientY - popup.getBoundingClientRect().top;
        popup.style.transition = 'none';
        document.body.style.userSelect = 'none'; // 禁止選取文字
    });

    document.addEventListener('mousemove', (e) => {
        if (isDragging) {
            popup.style.left = `${e.clientX - offsetX}px`;
            popup.style.top = `${e.clientY - offsetY}px`;
            popup.style.transform = 'none';
        }
    });

    document.addEventListener('mouseup', () => {
        isDragging = false;
        document.body.style.userSelect = ''; // 恢復文字選取
    });
    
    // 添加內容
    const contentElem = document.createElement('p');
    contentElem.textContent = content;
    contentElem.style.marginTop = '0'; // 上移文字
    popup.appendChild(contentElem);

    // 添加關閉按鈕
    const closeButton = document.createElement('button');
    closeButton.textContent = '關閉';
    closeButton.style.position = 'absolute';
    closeButton.style.top = '10px';
    closeButton.style.right = '10px';
    closeButton.addEventListener('click', () => {
        popup.remove();

        // 在關閉彈跳框後將焦點移回 SHPR_BAN_ID 欄位
        document.getElementById('SHPR_BAN_ID').focus();
    });
    popup.appendChild(closeButton);

    // 添加鍵盤事件監聽
    document.addEventListener('keydown', function escHandler(event) {
        // 檢查新增項次彈跳框是否未開啟
        const itemModal = document.getElementById('item-modal');
        if (itemModal && itemModal.style.display !== 'flex') {
            if (event.key === 'Escape') { // 檢查是否按下ESC鍵
                closeButton.focus(); // 將焦點移至關閉按鈕
            }
        }
    });
    
    // 添加到頁面
    document.body.appendChild(popup);
    
    // 顯示彈跳框
    popup.style.display = 'block';
}

function handleCountryCodeInput(inputId, relatedFields, requiredCountry) {
    // 當輸入特定國家代碼時，調整相關欄位的樣式
    document.getElementById(inputId).addEventListener('input', function () {
        let countryCode = this.value.toUpperCase().trim(); // 轉換為大寫並去除空白
        relatedFields.forEach(field => {
            updateFieldStyle(field, countryCode === requiredCountry);
        });
    });
}

// 啟用事件監聽，處理國家代碼的樣式變更
handleCountryCodeInput('CNEE_COUNTRY_CODE', ['CNEE_BAN_ID'], 'TW');

document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('input[type="text"], input[type="number"], textarea').forEach(input => {
        // 排除特定輸入框不顯示清除按鈕
        if (input.id === 'decimal-places' || 
            input.id === 'weight-decimal-places' || 
            input.id === 'specific-range' || 
            input.id === 'specific-weight' ||
            input.id === 'exchange-rate' ||
            input.id === 'start-number' ||
            input.id === 'Maker') {
            return;
        }

        input.dataset.prevValue = ""; // 初始化記錄原始值
        input.style.position = 'relative';
        input.parentNode.style.position = 'relative';

        // 建立清除按鈕
        const clearBtn = document.createElement('button');
        clearBtn.innerHTML = 'X';
        clearBtn.setAttribute('type', 'button');  // 防止觸發表單提交
        clearBtn.setAttribute('tabindex', '-1');  // 避免 TAB 鍵聚焦
        clearBtn.style.position = 'absolute';
        clearBtn.style.width = '20px';
        clearBtn.style.height = '20px';
        clearBtn.style.fontSize = '12px';
        clearBtn.style.color = 'gray';
        clearBtn.style.backgroundColor = '#e6e6e6';
        clearBtn.style.border = 'none';
        clearBtn.style.borderRadius = '50%';
        clearBtn.style.cursor = 'pointer';
        clearBtn.style.display = 'none';
        clearBtn.style.padding = '0';

        // 插入清除按鈕到輸入框的父容器內
        input.parentNode.insertBefore(clearBtn, input.nextSibling);

        // 設定按鈕位置（在輸入框內右側）
        const positionButton = () => {
            const inputStyle = window.getComputedStyle(input);
            const paddingRight = parseInt(inputStyle.paddingRight) || 0;
            const borderRight = parseInt(inputStyle.borderRightWidth) || 0;
            clearBtn.style.right = `${paddingRight + borderRight + 5}px`;
            clearBtn.style.top = `${input.offsetTop + (input.offsetHeight / 2) - (clearBtn.offsetHeight / 2)}px`;

            const hasDropdown = ['DCL_DOC_TYPE', 'TERMS_SALES', 'TRADE_MARK', 'ST_MTD'].includes(input.id);

            if (hasDropdown) {
                clearBtn.style.left = `${input.offsetLeft + input.offsetWidth - clearBtn.offsetWidth - paddingRight - borderRight - 20}px`;
            } else {
                clearBtn.style.left = `${input.offsetLeft + input.offsetWidth - clearBtn.offsetWidth - paddingRight - borderRight}px`;
            }
        };

        positionButton();
        window.addEventListener('resize', positionButton);
        window.addEventListener('scroll', positionButton);

        clearBtn.addEventListener('mousedown', (event) => {
            event.preventDefault();  // 防止輸入框失去焦點
        });
        
        // 事件處理：點擊清除按鈕
        clearBtn.addEventListener('click', (event) => {
            event.preventDefault();  // 阻止預設表單提交行為
            input.dataset.prevValue = input.value; // **記錄清除前的值**
            input.value = '';
            input.focus();
            clearBtn.style.display = 'none';

            // 查詢國家代碼：清除後立即更新過濾結果
            if (
                ['searchCode', 'searchChinese', 'searchEnglish', 'searchRegion', 'countryKeyword'].includes(input.id)
            ) {
                filterCountryTable();
            }
            
            switch (input.id) {
                case 'SHPR_BAN_ID':
                    handleCheck();
                    searchData();
                    break;
                case 'BUYER_E_NAME':
                    document.getElementById('BUYER_BAN').value = '';
                    break;
                case 'CNEE_COUNTRY_CODE':
                    let cneeFields = ['CNEE_BAN_ID'];
                    cneeFields.forEach(fieldId => {
                        let label = document.querySelector(`label[for="${fieldId}"]`);
                        if (label) {
                            label.style.background = 'transparent'; // 恢復背景透明
                        }
                    });
                    document.getElementById('CNEE_COUNTRY_CODE').value = '';
                    break;
                case 'TERMS_SALES':
                    let termsFields = ['FRT_AMT', 'INS_AMT', 'ADD_AMT', 'SUBTRACT_AMT'];
                    termsFields.forEach(fieldId => {
                        let label = document.querySelector(`label[for="${fieldId}"]`);
                        if (label) {
                            label.style.background = ''; // 恢復預設背景
                        }
                    });
                    break;
                case 'CURRENCY':
                    document.getElementById('exchange-rate').value = '';
                    let currencyError = document.getElementById("currency-error");
                    if (currencyError) {
                        currencyError.style.display = "none";
                    }
                    break;
                case 'CCC_CODE':
                    document.getElementById('TAX_RATE').value = '';
                    break;                    
                case 'CERT_NO':
                case 'CERT_NO_ITEM':
                case 'TARIFF_CODE':
                    document.getElementById('TARIFF_CODE').value = '';
                    triggerUpdateTariff();
                    break;
            }
        });

        // 監聽 `Alt + Backspace`，復原內容並手動觸發 `oninput` 和 `onblur`
        input.addEventListener('keydown', (event) => {
            if (event.altKey && event.key === 'Backspace') {
                event.preventDefault();
                if (input.dataset.prevValue !== "") {
                    input.value = input.dataset.prevValue;
                    input.dataset.prevValue = ""; // **清除記錄，避免多次撤銷**
                    
                    // **手動觸發 `input` 和 `blur` 事件**
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                    input.dispatchEvent(new Event('blur', { bubbles: true }));

                    // **顯示清除按鈕**
                    clearBtn.style.display = 'block';
                    positionButton(); // 確保按鈕位置正確
                }
            }
        });

        // 事件處理：輸入框獲取焦點時顯示按鈕（無論是否有內容）
        input.addEventListener('focus', () => {
            clearBtn.style.display = 'block';
            positionButton();
        });

        // 事件處理：輸入框內容改變時顯示或隱藏按鈕
        input.addEventListener('input', () => {
            clearBtn.style.display = input.value ? 'block' : 'none';
        });

        // 事件處理：輸入框失去焦點時隱藏按鈕
        input.addEventListener('blur', () => {
            clearBtn.style.display = 'none';
        });

        // 設定滑鼠移入與移出時的背景顏色變化
        clearBtn.addEventListener('mouseenter', () => {
            clearBtn.style.color = 'white';
            clearBtn.style.backgroundColor = '#f37380';
        });

        clearBtn.addEventListener('mouseleave', () => {
            clearBtn.style.color = 'gray';
            clearBtn.style.backgroundColor = '#e6e6e6';
        });
    });
});

let isWarningShown = false; // 在全域範圍宣告變數

function checkTotalAmount() {
    const totalAmountInput = document.getElementById('CAL_IP_TOT_ITEM_AMT');
    const totalAmount = parseFloat(totalAmountInput.value) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchange-rate').value) || 0;
    const usdExchangeRate = parseFloat(document.getElementById('usd-exchange-rate').value) || 0;

    if (totalAmount > 0 && exchangeRate > 0 && usdExchangeRate > 0) {
        const totalAmountInUSD = (totalAmount * exchangeRate) / usdExchangeRate;

        if (hasNoData && totalAmountInUSD > 20000) {
            if (!isWarningShown) {
                isWarningShown = true; // 設定旗標避免重複顯示
                iziToast.warning({
                    title: '注意',
                    message: `（個人或未向國際貿易署登記出進口廠商資料者，<br>
                    進口金額限制美金兩萬以下，且通關必驗，<br>
                    若金額超過美金兩萬需檢附輸入許可證才可進口）`,
                    position: 'center',
                    timeout: false,
                    backgroundColor: '#ffeb3b',
                    onClosed: function() {
                        isWarningShown = false; // 當提示關閉後重置旗標
                    }
                });
            }
        } else {
            isWarningShown = false; // 若金額沒超過兩萬或其他情況重置旗標
        }
    } else {
        isWarningShown = false; // 若條件不符合重置旗標
    }
}

document.addEventListener("DOMContentLoaded", function () {
    setupCneeCNameWatcher();
});

// 初始化監聽 CNEE_C_NAME 欄位變化
function setupCneeCNameWatcher() {
    const toggleLabel = document.getElementById("toggleCneeName");
    const cneeCNameGroup = document.getElementById("cnee_c_name_group");
    const cneeCNameInput = document.getElementById("CNEE_C_NAME");

    if (!toggleLabel || !cneeCNameGroup || !cneeCNameInput) return;

    function updateVisibility() {
        if (cneeCNameInput.value.trim() !== "") {
            cneeCNameGroup.classList.remove("hidden");
        } else {
            cneeCNameGroup.classList.add("hidden");
        }
        updateCneeLabelText(); // **確保標題同步變更**
    }

    // 監聽手動輸入變化
    cneeCNameInput.addEventListener("input", updateVisibility);
    cneeCNameInput.addEventListener("change", updateVisibility);

    // **監聽 `value` 變更，即使是程式設定**
    const observer = new MutationObserver(() => {
        updateVisibility();
        cneeCNameInput.dispatchEvent(new Event("input")); // 觸發 UI 更新
    });

    observer.observe(cneeCNameInput, { attributes: true, attributeFilter: ["value"] });

    // **點擊切換按鈕**
    toggleLabel.addEventListener("click", function () {
        if (cneeCNameGroup.classList.contains("hidden")) {
            cneeCNameGroup.classList.remove("hidden");
        } else {
            if (cneeCNameInput.value.trim() === "") {
                cneeCNameGroup.classList.add("hidden");
            }
        }
        updateCneeLabelText(); // **確保點擊按鈕時標題同步變更**
    });

    // **初始化 UI**
    updateVisibility();
}

// 匯入資料後，強制更新 CNEE_C_NAME 可見性 + 更新標題
function updateCneeCNameVisibility() {
    const cneeCNameInput = document.getElementById("CNEE_C_NAME");
    if (cneeCNameInput) {
        setTimeout(() => {
            cneeCNameInput.dispatchEvent(new Event("input")); // 觸發 UI 更新
            updateCneeLabelText(); // **確保標題也更新**
        }, 50); // 確保匯入資料後 UI 更新
    }
}

// 獨立函式：更新 `toggleLabel.textContent`
function updateCneeLabelText() {
   const toggleLabel = document.getElementById("toggleCneeName");
   const cneeCNameGroup = document.getElementById("cnee_c_name_group");

   if (toggleLabel && cneeCNameGroup) {
       toggleLabel.textContent = cneeCNameGroup.classList.contains("hidden")
           ? "賣方中/英名稱"
           : "賣方英文名稱";
   }
}

$(function () {
    // 中文語系設定
    $.datepicker.regional['zh-TW'] = {
        closeText: '關閉',
        prevText: '‹ 上月',
        nextText: '下月 ›',
        currentText: '今天',
        monthNames: ['一月','二月','三月','四月','五月','六月',
                     '七月','八月','九月','十月','十一月','十二月'],
        monthNamesShort: ['一月','二月','三月','四月','五月','六月',
                     '七月','八月','九月','十月','十一月','十二月'],
        dayNames: ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'],
        dayNamesShort: ['日','一','二','三','四','五','六'],
        dayNamesMin: ['日','一','二','三','四','五','六'],
        weekHeader: '週',
        dateFormat: 'yy/mm/dd',
        firstDay: 0,
        isRTL: false,
        showMonthAfterYear: true,
        yearSuffix: '年'
    };
    $.datepicker.setDefaults($.datepicker.regional['zh-TW']);
    
    $('.rocDate').each(function () {
        $(this).datepicker({
            dateFormat: 'yy/mm/dd',
            changeYear: true,
            changeMonth: true,
            yearRange: 'c-1:c+1', // 只顯示去年、今年、明年
            onSelect: function (dateText) {
                const rocDate = convertToRocDate(dateText);
                $(this).val(rocDate).focus();
            }
        });
    });

    function convertToRocDate(westernDate) {
        const [year, month, day] = westernDate.split('/');
        const rocYear = parseInt(year, 10) - 1911;
        return `${rocYear}/${month}/${day}`;
    }
});


