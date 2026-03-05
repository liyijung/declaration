// 匯入Excel的功能
function importToExcel(event) {
    clearField(); // 清空輸入框內容

    // 清空 calculation-status
    document.getElementById('calculation-status').value = "";
    
    const file = event.target.files[0];
    
    // 提取檔名中【】內的文字
    const matchRemark = file.name.match(/【(.*?)】/);
    let fileRemark = matchRemark ? matchRemark[1] : ''; // 若無則回傳空字串
    
    // 設定到 REMARK 欄位
    document.getElementById('REMARK').value = fileRemark;

    // 讀取 Excel 檔案
    const reader = new FileReader();
    reader.onload = function(event) {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        // 讀取報單表頭工作表
        const headerSheet = workbook.Sheets[workbook.SheetNames[0]];
        const headerData = XLSX.utils.sheet_to_json(headerSheet, { header: 1, raw: false });

        // 根據表頭判斷是出口還是進口
        const header = headerData.map(row => row[0]?.trim()).filter(Boolean);
        let headerMapping = {};

        // 定義中文名稱與欄位 ID 的對應關係
        if (header.includes('出口人統一編號')) {     
            // 出口報單   
            headerMapping = {
                '文件編號': 'FILE_NO',
                '運單號': 'LOT_NO',
                '出口人統一編號': 'SHPR_BAN_ID',
                '海關監管編號': 'SHPR_BONDED_ID',
                '出口人中文名稱': 'SHPR_C_NAME',
                '出口人英文名稱': 'SHPR_E_NAME',
                '出口人中文地址': 'SHPR_C_ADDR',
                '出口人英文地址': 'SHPR_E_ADDR',
                '出口人電話號碼': 'SHPR_TEL',
                '買方中文名稱': 'CNEE_C_NAME',
                '買方中/英名稱': 'CNEE_E_NAME',
                '買方中/英地址': 'CNEE_E_ADDR',
                '買方國家代碼': 'CNEE_COUNTRY_CODE',
                '買方統一編號': 'CNEE_BAN_ID',
                '收方名稱': 'BUYER_E_NAME',
                '收方地址': 'BUYER_E_ADDR',
                '總件數': 'TOT_CTN',
                '總件數單位': 'DOC_CTN_UM',
                '包裝說明': 'CTN_DESC',
                '總毛重': 'DCL_GW',
                '總淨重': 'DCL_NW',
                '報單類別': 'DCL_DOC_TYPE',
                '貿易條件': 'TERMS_SALES',
                '幣別': 'CURRENCY',
                '總金額': 'CAL_IP_TOT_ITEM_AMT',
                '運費': 'FRT_AMT',
                '保險費': 'INS_AMT',
                '應加費用': 'ADD_AMT',
                '應減費用': 'SUBTRACT_AMT',
                '標記及貨櫃號碼': 'DOC_MARKS_DESC',
                '其它申報事項': 'DOC_OTR_DESC',
                'REMARKS': 'REMARK1',
                '保稅廠統一編號': 'FAC_BAN_ID_EX',
                '保稅廠監管編號': 'FAC_BONDED_ID_EX',
                '出倉保稅倉庫統一編號': 'FAC_BAN_ID',
                '出倉保稅倉庫代碼': 'FAC_BONDED_ID',
                '進倉保稅倉庫統一編號': 'IN_BONDED_BAN',
                '進倉保稅倉庫代碼': 'IN_BONDED_CODE'
            };
        } else if (header.includes('進口人統一編號')) {
            // 進口報單
            headerMapping = {
                '文件編號': 'FILE_NO',
                '運單號': 'LOT_NO',
                '進口人統一編號': 'SHPR_BAN_ID',
                '海關監管編號': 'SHPR_BONDED_ID',
                '進口人中文名稱': 'SHPR_C_NAME',
                '進口人英文名稱': 'SHPR_E_NAME',
                '進口人中文地址': 'SHPR_C_ADDR',
                '進口人英文地址': 'SHPR_E_ADDR',
                '進口人電話號碼': 'SHPR_TEL',
                '賣方中文名稱': 'CNEE_C_NAME',
                '賣方中/英名稱': 'CNEE_E_NAME',
                '賣方中/英地址': 'CNEE_E_ADDR',
                '賣方國家代碼': 'CNEE_COUNTRY_CODE',
                '賣方統一編號': 'CNEE_BAN_ID',
                '進口日期(民國)': 'ARRIVAL_DATE',
                '報關日期(民國)': 'ACCEPTANCE_DATE',
                '出口日期(民國)': 'EXIT_DATE',
                '航機班次(空)': 'JOURNEY_ID',
                '起運口岸': 'LOADING_LOCATION',
                '總件數': 'TOT_CTN',
                '總件數單位': 'DOC_CTN_UM',
                '包裝說明': 'CTN_DESC',
                '總毛重': 'DCL_GW',
                '總淨重': 'DCL_NW',
                '報單類別': 'DCL_DOC_TYPE',
                '貿易條件': 'TERMS_SALES',
                '幣別': 'CURRENCY',
                '總金額': 'CAL_IP_TOT_ITEM_AMT',
                '運費': 'FRT_AMT',
                '保險費': 'INS_AMT',
                '應加費用': 'ADD_AMT',
                '應減費用': 'SUBTRACT_AMT',
                '標記及貨櫃號碼': 'DOC_MARKS_DESC',
                '其它申報事項': 'DOC_OTR_DESC',
                'REMARKS': 'REMARK1',
            };
        } else {
            iziToast.error({
                title: '錯誤',
                message: '無法辨識是進口或出口報單格式，請確認欄位名稱。',
                position: 'center'
            });
            return;
        }

        headerData.forEach((row) => {
            const fieldName = row[0] ? String(row[0]).trim() : ''; // 取 Excel 的中文名稱
            const fieldValue = row[1] ? String(row[1]).trim() : ''; // 對應值

            const id = headerMapping[fieldName]; // 對應到欄位 ID
            if (id) {
                const element = document.getElementById(id);
                if (element) {
                    let value = fieldValue;

                    // CURRENCY 欄位轉換處理
                    if (id === 'CURRENCY') {
                        value = value.toUpperCase() === 'NTD' ? 'TWD' : value.toUpperCase();
                    }

                    // 去除千分號的欄位處理
                    const fieldsToRemoveSeparators = [
                        'TOT_CTN', 'DCL_GW', 'DCL_NW', 'CAL_IP_TOT_ITEM_AMT', 'FRT_AMT', 'INS_AMT', 'ADD_AMT', 'SUBTRACT_AMT'
                    ];
                    if (fieldsToRemoveSeparators.includes(id)) {
                        value = removeThousandsSeparator(value);
                    }

                    // 需要轉換大寫的所有欄位 ID
                    const fieldIds = [
                        "LOT_NO", "SHPR_BAN_ID", "SHPR_BONDED_ID", "CNEE_COUNTRY_CODE", "DOC_CTN_UM","DCL_DOC_TYPE", "TERMS_SALES", "CURRENCY"
                    ];
                    if (fieldIds.includes(id)) {
                        value = value.toUpperCase();
                    }
                    element.value = value;
                }
            }
        });

        searchData(false); // 統一編號搜尋
        lookupExchangeRate(); // 當旬匯率
        handleCheck(); // 長期委任字號
        thingsToNote(); // 進口備註

        // 執行必填與不得填列欄位的檢查邏輯
        document.getElementById('CNEE_COUNTRY_CODE').dispatchEvent(new Event('input'));
        document.getElementById('TERMS_SALES').dispatchEvent(new Event('input'));
        
        // 檢查REMARKS欄位來勾選對應選項
        headerData.forEach(row => {
            const remarksIndex = row.indexOf('REMARKS');
            if (remarksIndex !== -1) {
                const remarks = row[remarksIndex + 1];
                checkRemarkOptions(String(remarks)); // 將值轉為字串
            }
        });

        // 讀取報單項次工作表
        const itemsSheet = workbook.Sheets[workbook.SheetNames[1]];
        const itemsData = XLSX.utils.sheet_to_json(itemsSheet, { header: 1, raw: false });

        // 讀取標題行，並動態定義品名欄位的索引
        const headers = itemsData[0];
        const descriptionIndices = [];
        headers.forEach((header, index) => {
            if (header && header === '品名') {
                descriptionIndices.push(index);
            }
        });

        // 將報單項次數據按品名分組並填充到表單中
        const itemContainer = document.getElementById('item-container');
        itemContainer.innerHTML = ''; // 清空現有項次

        let currentItem = null;
        let currentDescription = '';

        const tariffCodeMapping = {
            "IC": "8542390022",
        };

        // 對應系統欄位與 Excel 標題名稱
        const reverseColumnMap = {
            '數量': 'QTY',
            '單位': 'DOC_UM',
            '單價': 'DOC_UNIT_P',
            '金額': 'DOC_TOT_P',
            '稅則': 'CCC_CODE',
            '稅率': 'TAX_RATE',
            '納稅辦法': 'ST_MTD',
            '淨重': 'NET_WT',
            '生產國別': 'ORG_COUNTRY',
            '商標': 'TRADE_MARK',
            '型號': 'GOODS_MODEL',
            '規格': 'GOODS_SPEC',
            '原出口報單號碼': 'ORG_IMP_DCL_NO',
            '原出口報單項次': 'ORG_IMP_DCL_NO_ITEM',
            '買方料號': 'SELLER_ITEM_CODE',
            '保稅貨物註記': 'BOND_NOTE',
            '產證號碼': 'CERT_NO',
            '產證項次': 'CERT_NO_ITEM',
            '稅則附碼': 'TARIFF_CODE',
            '輸入許可號碼': 'EXP_NO',
            '輸入許可項次': 'EXP_SEQ_NO',
            '輸入許可號碼2': 'EXP_NO2',
            '輸入許可項次2': 'EXP_SEQ_NO2',
            '輸入許可號碼3': 'EXP_NO3',
            '輸入許可項次3': 'EXP_SEQ_NO3',
            '輸入許可號碼4': 'EXP_NO4',
            '輸入許可項次4': 'EXP_SEQ_NO4',
            '輸入許可號碼5': 'EXP_NO5',
            '輸入許可項次5': 'EXP_SEQ_NO5',
            '寬度(幅寬)': 'WIDE',
            '寬度單位': 'WIDE_UM',
            '長度(幅長)': 'LENGT_',
            '長度單位': 'LENGTH_UM',
            '主管機關指定代號': 'GOV_ASGN_NO',
            '統計數量': 'ST_QTY',
            '統計單位': 'ST_UM'
        };

        // 建立欄位名稱對應表（項次用）
        const headerIndexMap = {};
        headers.forEach((header, index) => {
            const fieldId = reverseColumnMap[header?.trim()];
            if (fieldId) {
                headerIndexMap[fieldId] = index;
            }
        });

        const allItemsEmpty = itemsData.slice(1).every(row => !row[0]); // 檢查項次是否完全空

        // 將報單項次數據填入表單
        itemsData.slice(1).forEach((row, index) => {
            const getValue = (row, field) => {
                const index = headerIndexMap[field];
                return index !== undefined ? row[index] : '';
            };

            const hasItemNo = row[0]; // 判斷項次是否有數據

            if (hasItemNo || allItemsEmpty || index === 0) {
                if (currentItem) {
                    currentItem.querySelector('.DESCRIPTION').value = currentDescription.trim();
                    itemContainer.appendChild(currentItem);
                }
                const description = descriptionIndices
                    .map(i => String(row[i] || '').trim()) // 去除前後空格
                    .filter(Boolean)
                    .join('\n');

                currentDescription = description;

                let cccCode = String(getValue(row, 'CCC_CODE') || '').trim();

                // 檢查CCC_CODE為空並匹配稅則
                if (!cccCode) {
                    // 將描述內容轉為大寫
                    const upperCaseDescription = currentDescription.toUpperCase();
                    const matchedCode = Object.keys(tariffCodeMapping).find(key =>
                        upperCaseDescription.split('\n').some(line => line.trim().startsWith(key.toUpperCase()))
                    );
                    if (matchedCode) {
                        cccCode = tariffCodeMapping[matchedCode];
                    }
                }
                
                currentItem = createItemRow({
                    ITEM_NO: String(row[0] || ''), // 將數據轉為字串
                    DESCRIPTION: currentDescription || '',
                    QTY: removeThousandsSeparator(String(getValue(row, 'QTY') || '')),
                    DOC_UM: String(getValue(row, 'DOC_UM') || ''),
                    DOC_UNIT_P: removeThousandsSeparator(String(getValue(row, 'DOC_UNIT_P') || '')),
                    DOC_TOT_P: removeThousandsSeparator(String(getValue(row, 'DOC_TOT_P') || '')),
                    CCC_CODE: cccCode, // 使用匹配稅則或原始值
                    TAX_RATE: String(getValue(row, 'TAX_RATE') || ''),
                    ST_MTD: String(getValue(row, 'ST_MTD') || '').toUpperCase(),
                    NET_WT: removeThousandsSeparator(String(getValue(row, 'NET_WT') || '')),
                    ORG_COUNTRY: String(getValue(row, 'ORG_COUNTRY') || '').toUpperCase(),
                    TRADE_MARK: String(getValue(row, 'TRADE_MARK') || ''),
                    GOODS_MODEL: String(getValue(row, 'GOODS_MODEL') || ''),
                    GOODS_SPEC: String(getValue(row, 'GOODS_SPEC') || ''),
                    ORG_IMP_DCL_NO: String(getValue(row, 'ORG_IMP_DCL_NO') || '').toUpperCase(),
                    ORG_IMP_DCL_NO_ITEM: removeThousandsSeparator(String(getValue(row, 'ORG_IMP_DCL_NO_ITEM') || '')),
                    SELLER_ITEM_CODE: String(getValue(row, 'SELLER_ITEM_CODE') || ''),
                    BOND_NOTE: String(getValue(row, 'BOND_NOTE') || '').toUpperCase(),
                    CERT_NO: String(getValue(row, 'CERT_NO') || '').toUpperCase(),
                    CERT_NO_ITEM: removeThousandsSeparator(String(getValue(row, 'CERT_NO_ITEM') || '')),
                    TARIFF_CODE: String(getValue(row, 'TARIFF_CODE') || '').toUpperCase(),
                    EXP_NO: String(getValue(row, 'EXP_NO') || '').toUpperCase(),
                    EXP_SEQ_NO: removeThousandsSeparator(String(getValue(row, 'EXP_SEQ_NO') || '')),
                    EXP_NO2: String(getValue(row, 'EXP_NO2') || '').toUpperCase(),
                    EXP_SEQ_NO2: removeThousandsSeparator(String(getValue(row, 'EXP_SEQ_NO2') || '')),
                    EXP_NO3: String(getValue(row, 'EXP_NO3') || '').toUpperCase(),
                    EXP_SEQ_NO3: removeThousandsSeparator(String(getValue(row, 'EXP_SEQ_NO3') || '')),
                    EXP_NO4: String(getValue(row, 'EXP_NO4') || '').toUpperCase(),
                    EXP_SEQ_NO4: removeThousandsSeparator(String(getValue(row, 'EXP_SEQ_NO4') || '')),
                    EXP_NO5: String(getValue(row, 'EXP_NO5') || '').toUpperCase(),
                    EXP_SEQ_NO5: removeThousandsSeparator(String(getValue(row, 'EXP_SEQ_NO5') || '')),
                    WIDE: removeThousandsSeparator(String(getValue(row, 'WIDE') || '')),
                    WIDE_UM: String(getValue(row, 'WIDE_UM') || ''),
                    LENGT_: removeThousandsSeparator(String(getValue(row, 'LENGT_') || '')),
                    LENGTH_UM: String(getValue(row, 'LENGTH_UM') || ''),
                    GOV_ASGN_NO: String(getValue(row, 'GOV_ASGN_NO') || ''),
                    ST_QTY: removeThousandsSeparator(String(getValue(row, 'ST_QTY') || '')),
                    ST_UM: String(getValue(row, 'ST_UM') || '')
                });
                
                if (row[1] === '*') {
                    currentItem.querySelector('.ITEM_NO').checked = true;
                }
            } else if (currentItem) {
                descriptionIndices.forEach(i => {
                    if (row[i]) {
                        currentDescription += `\n${String(row[i])}`;
                    }
                });
            }
        });

        if (currentItem) {
            currentItem.querySelector('.DESCRIPTION').value = currentDescription.trim();
            itemContainer.appendChild(currentItem);
        }
        updateCneeCNameVisibility();
        initializeListeners();
        renumberItems();
    };
    reader.readAsArrayBuffer(file);
}

// 去除千分號的輔助函數
function removeThousandsSeparator(value) {
    return value.replace(/,/g, '');
}

// 根據REMARKS欄位的值來勾選對應選項
function checkRemarkOptions(remarks) {
    const options = {
        '申請進口A式證明用聯': 'copy_2a',
        '申請進口B式證明用聯': 'copy_2b',
        '申請進口C式證明用聯': 'copy_2c',
        '申請沖退原料稅用聯': 'copy_3',
        '申請沖退原料稅(E化退稅)': 'copy_3e',
        '申請其他聯': 'copy_5'
    };

    let hasABC = false;

    Object.keys(options).forEach(key => {
        const checkbox = document.getElementById(options[key]);
        const isChecked = remarks.includes(key);
        checkbox.checked = isChecked;

        // 若是 A/B/C 任一有出現
        if (['copy_2a', 'copy_2b', 'copy_2c'].includes(options[key]) && isChecked) {
            hasABC = true;
        }
    });

    // 如果有 A/B/C 任一，勾選 copy_2
    const copy2 = document.getElementById('copy_2');
    copy2.checked = hasABC;

    // 確保 copy_2 勾選後觸發 checkbox 狀態更新（例如啟用ABC）
    if (typeof updateABCState === 'function') {
        updateABCState();
    }
}

// 匯出Excel的功能
function exportToExcel() {
    // 收集報單表頭數據
    const headerData = [
        ['文件編號', document.getElementById('FILE_NO').value],
        ['運單號', document.getElementById('LOT_NO').value],
        ['進口人統一編號', document.getElementById('SHPR_BAN_ID').value],
        ['海關監管編號', document.getElementById('SHPR_BONDED_ID').value],
        ['進口人中文名稱', document.getElementById('SHPR_C_NAME').value],
        ['進口人英文名稱', document.getElementById('SHPR_E_NAME').value],
        ['進口人中文地址', document.getElementById('SHPR_C_ADDR').value],
        ['進口人英文地址', document.getElementById('SHPR_E_ADDR').value],
        ['進口人電話號碼', document.getElementById('SHPR_TEL').value],
        ['賣方中文名稱', document.getElementById('CNEE_C_NAME').value],
        ['賣方中/英名稱', document.getElementById('CNEE_E_NAME').value],
        ['賣方中/英地址', document.getElementById('CNEE_E_ADDR').value],
        ['賣方國家代碼', document.getElementById('CNEE_COUNTRY_CODE').value],
        ['賣方統一編號', document.getElementById('CNEE_BAN_ID').value],
        ['進口日期(民國)', document.getElementById('ARRIVAL_DATE').value],
        ['報關日期(民國)', document.getElementById('ACCEPTANCE_DATE').value],
        ['出口日期(民國)', document.getElementById('EXIT_DATE').value],
        ['航機班次(空)', document.getElementById('JOURNEY_ID').value],
        ['起運口岸', document.getElementById('LOADING_LOCATION').value],
        ['總件數', document.getElementById('TOT_CTN').value],
        ['總件數單位', document.getElementById('DOC_CTN_UM').value],
        ['包裝說明', document.getElementById('CTN_DESC').value],
        ['總毛重', document.getElementById('DCL_GW').value],
        ['總淨重', document.getElementById('DCL_NW').value],
        ['報單類別', document.getElementById('DCL_DOC_TYPE').value],
        ['貿易條件', document.getElementById('TERMS_SALES').value],
        ['幣別', document.getElementById('CURRENCY').value],
        ['總金額', document.getElementById('CAL_IP_TOT_ITEM_AMT').value],
        ['運費', document.getElementById('FRT_AMT').value],
        ['保險費', document.getElementById('INS_AMT').value],
        ['應加費用', document.getElementById('ADD_AMT').value],
        ['應減費用', document.getElementById('SUBTRACT_AMT').value],
        ['標記及貨櫃號碼', document.getElementById('DOC_MARKS_DESC').value],
        ['其它申報事項', document.getElementById('DOC_OTR_DESC').value],
        ['REMARKS', document.getElementById('REMARK1').value],
    ];

    // 收集報單項次數據
    const itemsData = [
        ['No.', '項次(非必填，大品名註記以"*"表示，可無編號)', '數量', '單位', '單價', '金額', 
        '稅則', '稅率', '納稅辦法', '淨重', '生產國別', '商標', '型號', '規格', 
        '原出口報單號碼', '原出口報單項次', 
        '買方料號', '保稅貨物註記', '產證號碼', '產證項次', '稅則附碼',
        '輸入許可號碼', '輸入許可項次', '輸入許可號碼2', '輸入許可項次2', '輸入許可號碼3', '輸入許可項次3', 
        '輸入許可號碼4', '輸入許可項次4', '輸入許可號碼5', '輸入許可項次5', 
        '寬度(幅寬)', '寬度單位', '長度(幅長)', '長度單位', '主管機關指定代號', '統計數量', '統計單位']
    ];

    let itemNoCounter = 0; // 計算有效的 ITEM_NO
    let maxDescLines = 1; // 品名最大分行數，至少為1

    // 計算品名的最大行數
    document.querySelectorAll("#item-container .item-row").forEach((item) => {
        const description = item.querySelector('.DESCRIPTION').value || '';
        const lines = description.split('\n'); // 按行分割品名
        if (lines.length > maxDescLines) {
            maxDescLines = lines.length; // 更新最大行數
        }
    });

    // 動態增加品名欄位至表頭
    const fixedColumns = itemsData[0].slice(0, 2); // 保留前兩個固定欄位（No. 和 項次）
    const dynamicColumns = Array(maxDescLines).fill('品名'); // 動態生成品名欄位，至少包含1欄
    const remainingColumns = itemsData[0].slice(2); // 剩餘固定欄位
    itemsData[0] = [...fixedColumns, ...dynamicColumns, ...remainingColumns]; // 合併所有欄位

    // 處理每一項的數據
    const itemRows = document.querySelectorAll("#item-container .item-row");
    itemRows.forEach((item, index) => {
        const isChecked = item.querySelector('.ITEM_NO').checked;
    
        // 根據條件決定是否增加計數器
        if (!isChecked) {
            itemNoCounter++;
        }
    
        const description = item.querySelector('.DESCRIPTION').value || '';
        const descriptionLines = description.split('\n'); // 按行分割品名
    
        // 填充品名到多個欄位，未滿的部分補空，至少保留一個品名欄位
        const descriptionCols = Array.from({ length: maxDescLines }, (_, i) => descriptionLines[i] || '');
    
        // 添加固定數據
        itemsData.push([
            index + 1, // No.
            isChecked ? '*' : itemNoCounter, // 項次
            ...descriptionCols, // 動態品名欄位
            item.querySelector('.QTY').value || '', // 數量
            replaceValue('DOC_UM', item.querySelector('.DOC_UM').value || ''), // 單位
            item.querySelector('.DOC_UNIT_P').value || '', // 單價
            item.querySelector('.DOC_TOT_P').value || '', // 金額
            replaceValue('CCC_CODE', item.querySelector('.CCC_CODE').value || ''), // 稅則
            item.querySelector('.TAX_RATE').value || '', // 稅率
            item.querySelector('.ST_MTD').value || '', // 納稅辦法
            item.querySelector('.NET_WT').value || '', // 淨重
            item.querySelector('.ORG_COUNTRY').value || '', // 生產國別
            item.querySelector('.TRADE_MARK').value || '', // 商標
            item.querySelector('.GOODS_MODEL').value || '', // 型號
            item.querySelector('.GOODS_SPEC').value || '', // 規格            
            item.querySelector('.ORG_IMP_DCL_NO').value || '', // 原出口報單號碼
            item.querySelector('.ORG_IMP_DCL_NO_ITEM').value || '', // 原出口報單項次
            item.querySelector('.SELLER_ITEM_CODE').value || '', // 買方料號
            item.querySelector('.BOND_NOTE').value || '', // 保稅貨物註記
            item.querySelector('.CERT_NO').value || '', // 產證號碼
            item.querySelector('.CERT_NO_ITEM').value || '', // 產證項次
            item.querySelector('.TARIFF_CODE').value || '', // '稅則附碼'
            item.querySelector('.EXP_NO').value || '', // 輸入許可號碼
            item.querySelector('.EXP_SEQ_NO').value || '', // 輸入許可項次
            item.querySelector('.EXP_NO2').value || '', // 輸入許可號碼2
            item.querySelector('.EXP_SEQ_NO2').value || '', // 輸入許可項次2
            item.querySelector('.EXP_NO3').value || '', // 輸入許可號碼3
            item.querySelector('.EXP_SEQ_NO3').value || '', // 輸入許可項次3
            item.querySelector('.EXP_NO4').value || '', // 輸入許可號碼4
            item.querySelector('.EXP_SEQ_NO4').value || '', // 輸入許可項次4
            item.querySelector('.EXP_NO5').value || '', // 輸入許可號碼5
            item.querySelector('.EXP_SEQ_NO5').value || '', // 輸入許可項次5
            item.querySelector('.WIDE').value || '', // 寬度
            replaceValue('WIDE_UM', item.querySelector('.WIDE_UM').value || ''), // 寬度單位
            item.querySelector('.LENGT_').value || '', // 長度
            replaceValue('LENGTH_UM', item.querySelector('.LENGTH_UM').value || ''), // 長度單位
            item.querySelector('.GOV_ASGN_NO').value || '', // '主管機關指定代號'
            item.querySelector('.ST_QTY').value || '', // 統計數量
            replaceValue('ST_UM', item.querySelector('.ST_UM').value || ''), // 統計單位
        ]);
    });

    // 創建工作表
    const headerWorksheet = XLSX.utils.aoa_to_sheet(headerData);
    const itemsWorksheet = XLSX.utils.aoa_to_sheet(itemsData);

    // 設置報單表頭工作表 A 欄及 B 欄的欄寬
    headerWorksheet['!cols'] = [{ wpx: 150 }, { wpx: 250 }];
    
    // 設置 itemsWorksheet 每欄的欄寬
    const colWidth = 10; // 設定字符寬度
    const itemsCols = new Array(itemsData[0].length).fill({ wch: colWidth });
    itemsWorksheet['!cols'] = itemsCols;

    // 設置報單表頭 A 欄至 B 欄為文字格式
    for (let row = 0; row < headerData.length; row++) {
        for (let col = 0; col <= 1; col++) { // A 欄 (0) 到 B 欄 (1)
            const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
            if (headerWorksheet[cellRef]) {
                headerWorksheet[cellRef].t = 's'; // 設定文字格式
                headerWorksheet[cellRef].z = '@'; // 確保顯示為文字
            }
        }
    }

    // 取得工作表範圍
    const range = XLSX.utils.decode_range(itemsWorksheet['!ref']);

    // 更新工作表範圍
    itemsWorksheet['!ref'] = XLSX.utils.encode_range(range);

    let cellRefs = [];
    for (let row = range.s.r; row <= range.e.r; row++) {
        for (let col = range.s.c; col <= range.e.c; col++) {
            cellRefs.push(XLSX.utils.encode_cell({ r: row, c: col }));
        }
    }
    cellRefs.forEach(cellRef => {
        itemsWorksheet[cellRef] = itemsWorksheet[cellRef] || { t: 's', v: '' };
        itemsWorksheet[cellRef].t = 's';
        itemsWorksheet[cellRef].z = '@';
    });
    
    // 創建工作簿並添加工作表
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, headerWorksheet, '報單表頭');
    XLSX.utils.book_append_sheet(workbook, itemsWorksheet, '報單項次');

    // 文件名
    const fileName = document.getElementById('FILE_NO').value.trim() || '';
    const exporterName = document.getElementById('SHPR_C_NAME').value.trim() || '';
    const remarkElement = document.getElementById('REMARK').value.trim() || '';

    // remarkElement
    let remarkText = remarkElement;
    
    // 根據不同情境組合檔名
    let exportFileName = '';
    
    if (fileName && exporterName && remarkText) {
        exportFileName = `${fileName}-${exporterName}【${remarkText}】.xlsx`;
    } else if (fileName && exporterName) {
        exportFileName = `${fileName}-${exporterName}.xlsx`;
    } else if (fileName && remarkText) {
        exportFileName = `${fileName}【${remarkText}】.xlsx`;
    } else if (exporterName && remarkText) {
        exportFileName = `${exporterName}【${remarkText}】.xlsx`;
    } else if (fileName) {
        exportFileName = `${fileName}.xlsx`;
    } else if (exporterName) {
        exportFileName = `${exporterName}.xlsx`;
    } else if (remarkText) {
        exportFileName = `【${remarkText}】.xlsx`;
    } else {
        exportFileName = 'export.xlsx';
    }

    // 下載 Excel 文件
    XLSX.writeFile(workbook, exportFileName);
}

document.addEventListener('DOMContentLoaded', (event) => {
    // 添加事件監聽器到匯入Excel按鈕
    document.getElementById('import-excel').addEventListener('change', importToExcel, false);

    // 添加事件監聽器到匯出Excel按鈕
    document.getElementById('export-excel').addEventListener('click', exportToExcel);
});

