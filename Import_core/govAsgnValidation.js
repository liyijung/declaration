let govAsgnTariffSet = null;
let govAsgnTariffLoadingPromise = null;

const GOV_ASGN_DEFAULT_XLSX_PATH = './Import_format/環保署容器代碼鎖檔稅則(113年版)-zoo.xlsx';
const GOV_ASGN_CODE_REGEX = /^[A-Z][0-9]{2}$/;

function normalizeCccCode(value) {
    return String(value ?? '')
        .replace(/[.\-\s]/g, '')
        .trim()
        .toUpperCase();
}

function normalizeGovAsgnNo(value) {
    return String(value ?? '')
        .replace(/\s+/g, '')
        .trim()
        .toUpperCase();
}

function isValidGovAsgnNoFormat(value) {
    return GOV_ASGN_CODE_REGEX.test(normalizeGovAsgnNo(value));
}

async function loadGovAsgnTariffSet(filePath = GOV_ASGN_DEFAULT_XLSX_PATH) {
    if (govAsgnTariffSet instanceof Set) return govAsgnTariffSet;
    if (govAsgnTariffLoadingPromise) return govAsgnTariffLoadingPromise;

    govAsgnTariffLoadingPromise = (async () => {
        if (typeof XLSX === 'undefined') {
            throw new Error('尚未載入 XLSX 函式庫，請先確認 xlsx.full.min.js 已成功載入。');
        }

        const response = await fetch(filePath);
        if (!response.ok) {
            throw new Error(`無法載入主管機關指定代號稅則檔：${filePath}`);
        }

        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

        const set = new Set();

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i] || [];

            for (let j = 0; j < row.length; j++) {
                const normalized = normalizeCccCode(row[j]);
                if (normalized && /^\d{11}$/.test(normalized)) {
                    set.add(normalized);
                }
            }
        }

        govAsgnTariffSet = set;
        return govAsgnTariffSet;
    })();

    try {
        return await govAsgnTariffLoadingPromise;
    } finally {
        govAsgnTariffLoadingPromise = null;
    }
}

function getGovAsgnFieldLabel() {
    return '主管機關指定代號';
}

function getGovAsgnRuleMessage(type, cccCode = '') {
    const normalizedCcc = normalizeCccCode(cccCode);

    switch (type) {
        case 'required':
            return `稅則 ${normalizedCcc} 屬主管機關指定代號管制稅則，${getGovAsgnFieldLabel()}不可空白。`;
        case 'format':
            return `${getGovAsgnFieldLabel()}格式錯誤，需為三碼（首碼英文，二、三碼數字），例如 Z00。`;
        case 'notAllowed':
            return `稅則 ${normalizedCcc || '(空白)'} 不屬主管機關指定代號管制稅則，${getGovAsgnFieldLabel()}不可填列。`;
        default:
            return '主管機關指定代號檢查未通過。';
    }
}

async function validateGovAsgnRule(cccCode, govAsgnNo, options = {}) {
    const tariffSet = await loadGovAsgnTariffSet(options.filePath || GOV_ASGN_DEFAULT_XLSX_PATH);

    const normalizedCcc = normalizeCccCode(cccCode);
    const normalizedGov = normalizeGovAsgnNo(govAsgnNo);
    const matched = normalizedCcc ? tariffSet.has(normalizedCcc) : false;

    if (matched) {
        if (!normalizedGov) {
            return {
                valid: false,
                type: 'required',
                matched,
                normalizedCcc,
                normalizedGov,
                message: getGovAsgnRuleMessage('required', normalizedCcc)
            };
        }

        if (!isValidGovAsgnNoFormat(normalizedGov)) {
            return {
                valid: false,
                type: 'format',
                matched,
                normalizedCcc,
                normalizedGov,
                message: getGovAsgnRuleMessage('format', normalizedCcc)
            };
        }

        return {
            valid: true,
            type: 'ok',
            matched,
            normalizedCcc,
            normalizedGov,
            message: ''
        };
    }

    if (normalizedGov) {
        return {
            valid: false,
            type: 'notAllowed',
            matched,
            normalizedCcc,
            normalizedGov,
            message: getGovAsgnRuleMessage('notAllowed', normalizedCcc)
        };
    }

    return {
        valid: true,
        type: 'ok',
        matched,
        normalizedCcc,
        normalizedGov,
        message: ''
    };
}

function getRowItemNo(row) {
    return row?.querySelector('.item-number label')?.textContent?.trim() || '';
}

function getRowField(row, selector) {
    return row?.querySelector(selector) || null;
}

function clearGovAsgnHighlight(row) {
    const cccInput = getRowField(row, '.CCC_CODE');
    const govInput = getRowField(row, '.GOV_ASGN_NO');

    cccInput?.classList.remove('input-error-highlight');
    govInput?.classList.remove('input-error-highlight');
}

function addGovAsgnHighlight(row) {
    const cccInput = getRowField(row, '.CCC_CODE');
    const govInput = getRowField(row, '.GOV_ASGN_NO');

    cccInput?.classList.add('input-error-highlight');
    govInput?.classList.add('input-error-highlight');
}

function showGovAsgnToast(message, title = '注意') {
    if (typeof iziToast !== 'undefined') {
        iziToast.warning({
            title,
            message,
            position: 'topCenter'
        });
    } else {
        alert(`${title}\n${message}`);
    }
}

async function validateGovAsgnRow(row, options = {}) {
    if (!row) {
        return { valid: true, skipped: true };
    }

    const itemNo = getRowItemNo(row);
    if (itemNo === '*') {
        return { valid: true, skipped: true };
    }

    const cccInput = getRowField(row, '.CCC_CODE');
    const govInput = getRowField(row, '.GOV_ASGN_NO');

    if (!cccInput || !govInput) {
        return { valid: true, skipped: true };
    }

    clearGovAsgnHighlight(row);

    const result = await validateGovAsgnRule(cccInput.value, govInput.value, options);

    if (!result.valid) {
        addGovAsgnHighlight(row);
        return {
            ...result,
            itemNo,
            row,
            cccInput,
            govInput
        };
    }

    if (govInput.value !== result.normalizedGov) {
        govInput.value = result.normalizedGov;
    }

    return {
        ...result,
        itemNo,
        row,
        cccInput,
        govInput
    };
}

async function validateAllGovAsgnRows(options = {}) {
    const rows = document.querySelectorAll(options.rowSelector || '#item-container .item-row');

    for (const row of rows) {
        const result = await validateGovAsgnRow(row, options);
        if (!result.valid) {
            if (options.showToast !== false) {
                showGovAsgnToast(`第 ${result.itemNo} 項：${result.message}`);
            }
            result.govInput?.focus();
            return false;
        }
    }

    return true;
}

async function validateGovAsgnFromModal(options = {}) {
    const cccInput = document.getElementById(options.cccId || 'CCC_CODE');
    const govInput = document.getElementById(options.govId || 'GOV_ASGN_NO');

    if (!cccInput || !govInput) return true;

    cccInput.classList.remove('input-error-highlight');
    govInput.classList.remove('input-error-highlight');

    const result = await validateGovAsgnRule(cccInput.value, govInput.value, options);

    if (!result.valid) {
        cccInput.classList.add('input-error-highlight');
        govInput.classList.add('input-error-highlight');

        if (options.showToast !== false) {
            showGovAsgnToast(result.message);
        }

        govInput.focus();
        return false;
    }

    govInput.value = result.normalizedGov;
    return true;
}

function bindGovAsgnAutoFormat() {
    document.addEventListener('input', (event) => {
        const target = event.target;
        if (!target) return;

        const isGovField =
            target.id === 'GOV_ASGN_NO' ||
            target.classList?.contains('GOV_ASGN_NO');

        if (!isGovField) return;

        const raw = String(target.value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const firstChar = raw.slice(0, 1).replace(/[^A-Z]/g, '');
        const lastTwo = raw.slice(1).replace(/[^0-9]/g, '').slice(0, 2);
        target.value = (firstChar + lastTwo).slice(0, 3);
    });
}

async function initGovAsgnValidation(options = {}) {
    await loadGovAsgnTariffSet(options.filePath || GOV_ASGN_DEFAULT_XLSX_PATH);
    if (options.bindAutoFormat !== false) {
        bindGovAsgnAutoFormat();
    }
}

window.loadGovAsgnTariffSet = loadGovAsgnTariffSet;
window.validateGovAsgnRule = validateGovAsgnRule;
window.validateGovAsgnRow = validateGovAsgnRow;
window.validateAllGovAsgnRows = validateAllGovAsgnRows;
window.validateGovAsgnFromModal = validateGovAsgnFromModal;
window.initGovAsgnValidation = initGovAsgnValidation;
window.normalizeGovAsgnNo = normalizeGovAsgnNo;
window.normalizeCccCode = normalizeCccCode;
window.isValidGovAsgnNoFormat = isValidGovAsgnNoFormat;
