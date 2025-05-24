// 依據統一編號的不同範圍對應相應的CSV檔案
let csvFiles = [
    { range: ['0'], file: 'companyData0.csv' },
    { range: ['1'], file: 'companyData1.csv' },
    { range: ['2'], file: 'companyData2.csv' },
    { range: ['3'], file: 'companyData3.csv' },
    { range: ['4'], file: 'companyData4.csv' },
    { range: ['5'], file: 'companyData5.csv' },
    { range: ['6'], file: 'companyData6.csv' },
    { range: ['7'], file: 'companyData7.csv' },
    { range: ['8'], file: 'companyData8.csv' },
    { range: ['9'], file: 'companyData9.csv' },
];

// 根據統一編號匹配應該加載的CSV檔案
function getMatchingFile(searchCode) {
    const prefix1 = searchCode.substring(0, 1); // 取統一編號的第 1 碼

    let matchingFile = csvFiles.find(item => {
        // 使用前 1 碼進行匹配
        return prefix1 === item.range[0];
    });

    // 檢查是否找到相應檔案，並回傳包含路徑的檔名
    return matchingFile ? `companyData/${matchingFile.file}` : null;
}

const noDataMessage = document.getElementById('noDataMessage'); // 錯誤訊息元素

let hasNoData = false; // 預設有資料

// 查找資料並自動帶入表單
function searchData(showErrorMessage = false) {
    hasNoData = false; // 每次查詢前重置
    let searchCode = document.getElementById('SHPR_BAN_ID').value.trim();

    // 如果輸入不滿 8 碼，清空資料並隱藏錯誤訊息，不進行匹配操作
    if (searchCode.length < 8) {
        clearSHPRFields();
        noDataMessage.style.display = 'none'; // 隱藏錯誤訊息
        return;
    }

    //驗證號碼
    const dclDocExamInput = document.getElementById('DCL_DOC_EXAM');

    if (/^\d{8}$/.test(searchCode)) {
        // 8碼數字
        dclDocExamInput.value = '58';
    } else if (/^[A-Za-z]\d{9}$/.test(searchCode)) {
        // 1碼英文+9碼數字
        dclDocExamInput.value = '174';
        hasNoData = true;
    } else {
        dclDocExamInput.value = ''; // 格式不符則清空
    }

    const fileToSearch = getMatchingFile(searchCode);

    if (fileToSearch) {
        Papa.parse(fileToSearch, {
            download: true,
            header: true,
            complete: function(results) {
                const record = results.data.find(row => row['統一編號'] === searchCode);

                if (record) {
                    hasNoData = false; // 有資料

                    // 填入資料並隱藏錯誤訊息
                    fillSHPRFields(record);

                    noDataMessage.style.display = 'none'; // 隱藏"查無資料"訊息

                    // 檢查是否為非營業中
                    if (record['進口資格'] === '無' && record['出口資格'] === '無') {
                        alert('該公司無進出口資格，請確認是否為非營業中。');
                    }
                } else {
                    hasNoData = true; // 查無資料
                    clearSHPRFields(); // 清空欄位
                    noDataMessage.style.display = 'inline'; // 顯示"查無資料"訊息
                    
                    // 查找出口備註是否有 "未向國際貿易署登記出進口廠商資料者"
                    checkUnregisteredCompany(searchCode);
                }
            }
        });
    }
    thingsToNote(); // 出口備註
}

// 覆蓋更新
function fillSHPRFields(data) {
    const fields = [
        { id: 'SHPR_C_NAME', label: '廠商中文名稱', value: data['廠商中文名稱'] || '' },
        { id: 'SHPR_E_NAME', label: '廠商英文名稱', value: data['廠商英文名稱'] || '' },
        { id: 'SHPR_C_ADDR', label: '中文營業地址', value: data['中文營業地址'] || '' },
        { id: 'SHPR_E_ADDR', label: '英文營業地址', value: data['英文營業地址'] || '' },
        { id: 'SHPR_TEL', label: '電話號碼', value: data['電話號碼'] || '' },
        { id: 'IMP_QUAL', label: '進口資格', value: data['進口資格'] || '' },
        { id: 'EXP_QUAL', label: '出口資格', value: data['出口資格'] || '' }
    ];

    const diffFields = fields.filter(field => {
        const current = document.getElementById(field.id).value.trim();
        return current && current !== field.value;
    });

    const url = window.location.href.toLowerCase();
    let label = '出口人欄位';
    if (url.includes('import') || url.includes('mode=import') || url.includes('#import')) {
        label = '進口人欄位';
    }

    if (diffFields.length === 0) {
        // 無差異，直接填入
        fields.forEach(field => {
            document.getElementById(field.id).value = field.value;
        });
    } else {
        const fieldList = diffFields.map(f => {
            const current = document.getElementById(f.id).value.trim();
            return `• ${f.label}：<br>　目前為「<b>${current}</b>」<br>　將覆蓋為「<b>${f.value}</b>」`;
        }).join('<br><br>');

        iziToast.question({
            timeout: false,
            close: false,
            overlay: true,
            displayMode: 'once',
            title: `${label}資料不同`,
            message: `以下欄位資料將被覆蓋，是否確定更新？<br><br>${fieldList}`,
            position: 'topRight',
            buttons: [
                ['<button>是，覆蓋</button>', function (instance, toast) {
                    fields.forEach(field => {
                        document.getElementById(field.id).value = field.value;
                    });
                    instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
                }, true],
                ['<button>否，保留</button>', function (instance, toast) {
                    instance.hide({ transitionOut: 'fadeOut' }, toast, 'button');
                }]
            ]
        });
    }
}

// 清空 SHPR 欄位
function clearSHPRFields() {
    document.getElementById('SHPR_C_NAME').value = '';
    document.getElementById('SHPR_E_NAME').value = '';
    document.getElementById('SHPR_C_ADDR').value = '';
    document.getElementById('SHPR_E_ADDR').value = '';
    document.getElementById('SHPR_TEL').value = '';
}

// 查找未登記公司
function checkUnregisteredCompany(SHPR_BAN_ID) {
    fetch('./Export_format/thingsToNote.xlsx')
        .then(response => {
            if (!response.ok) throw new Error('無法讀取出口備註');
            return response.arrayBuffer();
        })
        .then(data => {
            const workbook = XLSX.read(data, { type: 'array' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

            let matchedData = null;

            // 遍歷 rows，查找 `SHPR_BAN_ID`
            rows.forEach(row => {
                if (row[1] && row[1].toString().trim() === SHPR_BAN_ID) {
                    matchedData = row[2]; // 找到與 SHPR_BAN_ID 匹配的 `row[2]`
                }
            });

            // 若有找到 `SHPR_BAN_ID`，進一步檢查 `row[2]` 是否包含 "未向國際貿易署登記出進口廠商資料者"
            if (matchedData && matchedData.includes('未向國際貿易署登記出進口廠商資料者')) {
                const extractedData = matchedData.split('\n').map(line => line.trim()).filter(line => line.length > 0);

                // 尋找包含 `SHPR_BAN_ID` 的行
                const companyLine = extractedData.find(line => line.includes(SHPR_BAN_ID));

                if (companyLine) {
                    // 確保 `companyLine` 可以分割
                    let companyInfo = companyLine.split(SHPR_BAN_ID);
                    let companyName = companyInfo.length > 1 ? companyInfo[1].trim() : '';

                    if (companyName) {
                        document.getElementById('SHPR_C_NAME').value = companyName;
                        document.getElementById('SHPR_E_NAME').value = companyName;
                    }

                    if (extractedData.length >= 2) {
                        document.getElementById('SHPR_C_ADDR').value = extractedData[1] || '';
                        document.getElementById('SHPR_E_ADDR').value = extractedData[1] || '';
                    }

                    // 隱藏 "查無資料" 訊息
                    const noDataMessage = document.getElementById('noDataMessage');
                    if (noDataMessage) {
                        noDataMessage.style.display = 'none';
                    }
                }
            }
        })
        .catch(error => {
            console.error('讀取出口備註時發生錯誤:', error);
            alert('讀取出口備註失敗');
        });
}

// 統一編號搜尋
document.getElementById('SHPR_BAN_ID').addEventListener('input', function() {
    searchData(false);
});

let cachedAeoMapping = null;

// 取得 AEO 對照表並快取
async function getAeoMapping() {
    if (cachedAeoMapping) return cachedAeoMapping;  // 若已有緩存，直接返回

    try {
        const response = await fetch('AEO_mapping.csv');
        const csvText = await response.text();
        const aeoData = Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true
        }).data;

        const aeoMapping = {};
        aeoData.forEach(row => {
            aeoMapping[row['統一編號']] = row['AEO編號'];  // 儲存 AEO 編號
        });

        cachedAeoMapping = aeoMapping;  // 快取對照表
        return aeoMapping;
    } catch (error) {
        console.error('載入 AEO 對照表時發生錯誤:', error);
        return {};
    }
}

// 取得 AEO 編號的通用函數
async function getAeoNumber(shprBanId) {
    const aeoMapping = await getAeoMapping();
    return aeoMapping[shprBanId] || '';  // 若查不到則返回空字串
}
