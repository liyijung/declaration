(() => {
  // ========== 0) 進口樣板欄位順序（直接依上傳的 20251222 樣板） ==========
  const IMPORT_HEAD_FIELDS = [
    'DCL_COMP_ID','BROKER_BOX_NO','LICENCED_AGENT_NO','DOC_HEAD_DOC_NO','BROKER_AEO','AIR_SEA',
    'DCL_DOC_TYPE','DCL_DOC_NO','DOC_YY','DOC5','MAWB','HAWB','TRANS_VIA','FLY_NO','FROM_CODE',
    'WAREHOUSE','TOT_CTN','DOC_CTN_UM','CTN_DESC','DCL_GW','DCL_NW',
    'NET_WT','FRT_AMT','INS_AMT','ADD_AMT','SUBTRACT_AMT','DOC_MARKS_DESC','DOC_IMP_DATE','DCL_DATE',
    'DOC_EXP_DATE','LOT_NO','PROC_NO','EXAM_TYPE','COPY_NUM','DCL_PASS_METHOD','TERMS_SALES',
    'FOB_AMT','DOC_IMP_CIF_AMT','DOC_IMP_CIF_TWD','MESSAGE_TYPE','CURRENCY','P_DOC_ITEM_FRN',
    'SHPR_BAN_ID','SHPR_CODE','SHPR_C_NAME','SHPR_E_NAME','SHPR_C_ADDR','SHPR_E_ADDR','SHPR_TEL',
    'DCL_DOC_EXAM','SHPR_BONDED_ID','DCL_DOC_DUTY_VIA','DCL_DOC_CASE_NO','DOC_RELATIONS','SHPR_AEO',
    'NX_PayAccountBisID','CNEE_BAN_ID','CNEE_CODE','CNEE_C_NAME','CNEE_E_NAME','CNEE_C_ADDR',
    'CNEE_E_ADDR','CNEE_COUNTRY_CODE','CNEE_BONDED_ID','CNEE_AEO','CO_PACKING_NOTE','APP_PERMIT',
    'STOCK_IN_CTN','EX_TAX_AMT_1','DOC_OTR_DESC','REMARK1','DELIVER_TO','MEMO2','NX_UNIQUE_NO'
  ];

  const IMPORT_ITEM_FIELDS = [
    'ITEM_NO','DESCRIPTION','TERMS','QTY','NET_WT','DOC_UM','DOC_UNIT_P','FOB_TWD','PER','DOC_TOT_P',
    'BUYER_ITEM_CODE','SELLER_ITEM_CODE','GOODS_BRAND','GOODS_MODEL','GOODS_SPEC','CCC_CODE',
    'TAX_RATE_P','PERCENT_OF_AMT','SUB_CCC_CODE','CCC_ADD_1','COMM_TAX_RATE','TAX_METHOD','ST_QTY',
    'ALCOHOL','TAX_AMT_V','AFTER_TAX_QTY','TAX_AMT_V_UM','ORG_COUNTRY','GOV_ASGN_NO','GOV_ASGN_NO2',
    'GOV_ASGN_NO3','GOV_ASGN_NO4','GOV_ASGN_NO5','GOV_ASGN_NO6','GOV_ASGN_NO7','GOV_ASGN_NO8',
    'GOV_ASGN_NO9','GOV_ASGN_NO10','EXAM_CODE','ISSUE_DEPT','ISSUE_DEPT2','ISSUE_DEPT3','ISSUE_DEPT4',
    'ISSUE_DEPT5','EXP_NO','EXP_NO2','EXP_NO3','EXP_NO4','EXP_NO5','EXP_SEQ_NO','EXP_SEQ_NO2',
    'EXP_SEQ_NO3','EXP_SEQ_NO4','EXP_SEQ_NO5','ORIGIN_CERTIFICATE_NO','ORIGIN_CERTIFICATE_ITEM',
    'org_EXP_DCL_NO','org_EXP_DCL_ITEM','org_DCL_NO','org_DCL_NO_ITEM','P_QTY','P_UM','BONDED_QTY',
    'BONDED_UM','DOMESTIC_RATE','WIDE','WIDE_UM','LENGT_','LENGTH_UM','OTHER_TAX_ID_1','OTHER_TAX_ID_2',
    'OTHER_TAX_ID_3','OTHER_TAX_ID_4','OTHER_TAX_ID_5','OTHER_TAX_ID_6','OTHER_TAX_ID_7','OTHER_TAX_ID_8',
    'OTHER_TAX_ID_9','ST_MTD','INN','LUXURY_TAX_RATE','LUXURY_THRESHOLD','AtaRef','CustSref','LOT','PO',
    'remark_01','remark_02','remark_03','remark_04','remark_05','remark_06','remark_07','remark_08',
    'remark_09','remark_10'
  ];

  // ✅ 固定值（只放確認永遠固定的）
  const HEAD_DEFAULTS = {
    DCL_COMP_ID: 'B',           // 報關分公司
    BROKER_BOX_NO: '709',       // 箱號
    LICENCED_AGENT_NO: '00755'  // 專責代碼
  };


  // ========== 1) 逃逸 XML ==========
  function escapeXmlLocal(unsafe) {
    return String(unsafe ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
  const escapeXmlFn = (typeof window.escapeXml === 'function') ? window.escapeXml : escapeXmlLocal;

  // ========== 2) 反查：Head XML欄位名 -> 系統欄位ID ==========
  function buildHeadReverseMap() {
    const rev = {};
    // headerToXmlNameMap：系統ID -> XML名
    if (typeof window.headerToXmlNameMap === 'object' && window.headerToXmlNameMap) {
      Object.keys(window.headerToXmlNameMap).forEach(sysId => {
        const xmlName = window.headerToXmlNameMap[sysId];
        rev[xmlName] = sysId;
      });
    }
    return rev;
  }

  // ========== 3) 反查：Item XML欄位名 -> 系統 className ==========
  function buildItemReverseMap() {
    const rev = {};
    // xmlItemNameMap：XML名 -> 系統class
    if (typeof window.xmlItemNameMap === 'object' && window.xmlItemNameMap) {
      Object.keys(window.xmlItemNameMap).forEach(xmlName => {
        rev[xmlName] = window.xmlItemNameMap[xmlName];
      });
    }
    // itemToXmlNameMap：系統class -> XML名（也能反推）
    if (typeof window.itemToXmlNameMap === 'object' && window.itemToXmlNameMap) {
      Object.keys(window.itemToXmlNameMap).forEach(cls => {
        const xmlName = window.itemToXmlNameMap[cls];
        if (!rev[xmlName]) rev[xmlName] = cls;
      });
    }
    return rev;
  }

  // ========== 4) Head 取值 ==========
  function getHeadValue(xmlFieldName, headRevMap) {
    // 特例：DOC_HEAD_DOC_NO 直接取 FILE_NO（空值則往下走）
    if (xmlFieldName === 'DOC_HEAD_DOC_NO') {
      const el = document.getElementById('FILE_NO');
      const v = el ? String(el.value ?? '').trim() : '';
      if (v) return v;
    }
    // === NET_WT 對應（UI 常用欄位名不同的保險）===
    if (xmlFieldName === 'NET_WT') {
      const candidates = ['NET_WT', 'DCL_NW', 'DOC_NW', 'NW'];
      for (const id of candidates) {
        const el = document.getElementById(id);
        if (el && 'value' in el) {
          const v = String(el.value ?? '').trim();
          if (v) return v;
        }
      }
      const extra = window.__IMPORT_XML_EXTRA__?.head;
      if (extra && extra.NET_WT != null) return String(extra.NET_WT).trim();
    }


    // (a) 若剛好 ID 同名（少數可能）
    const same = document.getElementById(xmlFieldName);
    if (same && 'value' in same) {
      const v = String(same.value ?? '').trim();
      if (v) return v;
    }

    // (b) 走反查 map：XML名 -> 系統ID
    const sysId = headRevMap[xmlFieldName];
    if (sysId) {
      const el = document.getElementById(sysId);
      if (el && 'value' in el) {
        const v = String(el.value ?? '').trim();
        if (v) return v;
      }
    }

    // ✅ 若 UI 沒值，且匯入外掛有 extra，就用 extra 補回（round-trip 不掉）
    const extraHead = window.__IMPORT_XML_EXTRA__?.head;
    if (extraHead && extraHead[xmlFieldName] != null) {
      const v = String(extraHead[xmlFieldName] ?? '').trim();
      if (v) return v;
    }

    // ✅ 固定值（只在取不到/空值時才補）
    if (HEAD_DEFAULTS[xmlFieldName] != null) {
      return String(HEAD_DEFAULTS[xmlFieldName]).trim();
    }

    return '';
  }
  // ========== 5) Item 取值 ==========
  function getItemValue(itemRow, xmlFieldName, itemRevMap) {
    // ITEM_NO：沿用系統「勾選則 *，否則連號」習慣
    if (xmlFieldName === 'ITEM_NO') return null; // 外面統一處理

    // (a) 如果 class 同名
    let input = itemRow.querySelector(`.${xmlFieldName}`);

    // (b) 反查 XML名 -> className
    if (!input) {
      const cls = itemRevMap[xmlFieldName];
      if (cls) input = itemRow.querySelector(`.${cls}`);
    }

    if (!input) return '';

    if (input.type === 'checkbox') {
      return input.checked ? 'Y' : '';
    }
    return String(input.value ?? '').trim();
  }

  // ========== 6) 組進口 XML ==========
  function buildImportXml() {
    // 如果原本有 updateVariables()（xmlHandler_v2 內匯出前會跑），這裡也跑一次
    if (typeof window.updateVariables === 'function') {
      window.updateVariables();
    }

    // 🔥 修正原本 mapping 的問題：SELLER_ITEM_CODE 不要再被輸出成 BUYER_ITEM_CODE
    // 不改原檔，只在 runtime 修正
    if (typeof window.itemToXmlNameMap === 'object' && window.itemToXmlNameMap) {
      if (window.itemToXmlNameMap.SELLER_ITEM_CODE === 'BUYER_ITEM_CODE') {
        window.itemToXmlNameMap.SELLER_ITEM_CODE = 'SELLER_ITEM_CODE';
      }
    }
    if (typeof window.xmlItemNameMap === 'object' && window.xmlItemNameMap) {
      if (window.xmlItemNameMap.BUYER_ITEM_CODE === 'SELLER_ITEM_CODE') {
        // 保留 BUYER_ITEM_CODE 的反查，不要強行指到 SELLER_ITEM_CODE
        // 讓 BUYER_ITEM_CODE 沒有對應 class 就自然空值（比較安全）
        delete window.xmlItemNameMap.BUYER_ITEM_CODE;
      }
    }

    const headRevMap = buildHeadReverseMap();
    const itemRevMap = buildItemReverseMap();

    let xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<Root>\n` +
      `  <sys_code>GICCDSI</sys_code>\n` +
      `<head>\n` +
      `  <head_table_name>DOC_H_I</head_table_name>\n`;

    // Head：照樣板順序輸出
    for (const f of IMPORT_HEAD_FIELDS) {
      const v = getHeadValue(f, headRevMap);
      xml +=
        `  <fields>\n` +
        `    <field_name>${f}</field_name>\n` +
        `    <field_value>${escapeXmlFn(v)}</field_value>\n` +
        `  </fields>\n`;
    }

    xml +=
      `</head>\n` +
      `<detail>\n` +
      `  <detail_table_name>DI_INVBD</detail_table_name>\n`;

    const rows = document.querySelectorAll('#item-container .item-row');
    let seq = 1;

    rows.forEach((row, idx) => {
      xml += `  <items>\n`;

      // ITEM_NO：勾選則 *，否則連號
      const chk = row.querySelector('.ITEM_NO');
      const itemNo = (chk && chk.type === 'checkbox' && chk.checked) ? '*' : String(seq++);
      xml +=
        `    <fields>\n` +
        `      <field_name>ITEM_NO</field_name>\n` +
        `      <field_value>${escapeXmlFn(itemNo)}</field_value>\n` +
        `    </fields>\n`;

      for (const f of IMPORT_ITEM_FIELDS) {
        if (f === 'ITEM_NO') continue;
        let v = getItemValue(row, f, itemRevMap);

        // ✅ 若 UI 沒值，改用匯入外掛暫存補回（round-trip 不掉）
        const extraItem = window.__IMPORT_XML_EXTRA__?.items?.[idx];
        if ((!v || v === '') && extraItem && extraItem[f] != null) {
          v = String(extraItem[f]).trim();
        }
        xml +=
          `    <fields>\n` +
          `      <field_name>${f}</field_name>\n` +
          `      <field_value>${escapeXmlFn(v)}</field_value>\n` +
          `    </fields>\n`;
      }

      xml += `  </items>\n`;
    });

    xml += `</detail>\n</Root>`;
    return xml;
  }

  // ========== 7) 下載 ==========
  function downloadText(filename, text) {
    const blob = new Blob([text], { type: 'application/xml;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ========== 8) 直接取代原本匯出（移除舊 listener 的方式：clone 節點） ==========
  function replaceExportHandler() {
    const btn = document.getElementById('export-to-xml');
    if (!btn) return;

    const newBtn = btn.cloneNode(true); // clone 會移除所有舊 addEventListener
    btn.parentNode.replaceChild(newBtn, btn);

    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const xml = buildImportXml();

        // 檔名：沿用 FILE_NO（有就用），沒有就 fallback
        const fileNo = (document.getElementById('FILE_NO')?.value || '').trim();
        const filename = fileNo ? `${fileNo}.xml` : `import.xml`;

        downloadText(filename, xml);
      } catch (err) {
        console.error(err);
        alert('外掛匯出進口XML失敗，請開啟 Console 查看錯誤。');
      }
    }, true);
  }

  // ========== 9) 啟動 ==========
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceExportHandler);
  } else {
    replaceExportHandler();
  }

  // 方便在 console 測試
  window.buildImportXmlByPlugin = buildImportXml;
})();
