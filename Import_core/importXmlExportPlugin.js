(() => {
  // ========== 0) 進口樣板欄位順序（直接依上傳的 20251222 樣板） ==========
    const IMPORT_HEAD_FIELDS = [
    'DCL_COMP_ID',
    'BROKER_BOX_NO',
    'LICENCED_AGENT_NO',
    'DOC_HEAD_DOC_NO',
    'BROKER_AEO',
    'COMBINE_DECLAR',
    'AIR_SEA',
    'DCL_DOC_TYPE',
    'DCL_DOC_NO',
    'DOC_YY',
    'DOC5',
    'MAWB',
    'HAWB',
    'TRANS_VIA',
    'FLY_NO',
    'FROM_CODE',
    'WAREHOUSE',
    'TOT_CTN',
    'DOC_CTN_UM',
    'CTN_DESC',
    'DCL_GW',
    'DCL_NW',
    'DOC_IMP_DATE',
    'DCL_DATE',
    'DOC_EXP_DATE',
    'LOT_NO',
    'PROC_NO',
    'EXAM_TYPE',
    'COPY_NUM',
    'DCL_PASS_METHOD',
    'TERMS_SALES',
    'FOB_AMT',
    'DOC_IMP_CIF_AMT',
    'DOC_IMP_CIF_TWD',
    'P_DOC_ITEM_FRN',
    'CURRENCY',
    'FRT_AMT',
    'INS_AMT',
    'ADD_AMT',
    'SUBTRACT_AMT',
    'MESSAGE_TYPE',
    'SHPR_CODE',
    'SHPR_C_NAME',
    'SHPR_E_NAME',
    'SHPR_C_ADDR',
    'SHPR_E_ADDR',
    'SHPR_BAN_ID',
    'SHPR_BONDED_ID',
    'DCL_DOC_DUTY_VIA',
    'DCL_DOC_CASE_NO',
    'DOC_RELATIONS',
    'SHPR_AEO',
    'NX_PayAccountBisID',
    'CNEE_CODE',
    'CNEE_E_NAME',
    'CNEE_E_ADDR',
    'CNEE_C_NAME',
    'CNEE_C_ADDR',
    'CNEE_BAN_ID',
    'CNEE_BONDED_ID',
    'CNEE_COUNTRY_CODE',
    'CNEE_AEO',
    'CO_PACKING_NOTE',
    'APP_PERMIT',
    'STOCK_IN_CTN',
    'FAC_BAN_ID_EX',
    'FAC_BONDED_ID_EX',
    'EX_TAX_AMT_1',
    'DOC_MARKS_DESC',
    'DOC_OTR_DESC',
    'MEMO2',
    'REMARK1',
    'DELIVER_TO',
    'MEMO2',
    'NX_UNIQUE_NO'
  ];

    const IMPORT_ITEM_FIELDS = [
    'ITEM_NO',
    'DESCRIPTION',
    'TERMS',
    'QTY',
    'DOC_UM',
    'DOC_UNIT_P',
    'FOB_TWD',
    'PER',
    'DOC_TOT_P',
    'BUYER_ITEM_CODE',
    'GOODS_BRAND',
    'GOODS_MODEL',
    'GOODS_SPEC',
    'CCC_CODE',
    'TAX_RATE_P',
    'PERCENT_OF_AMT',
    'SUB_CCC_CODE',
    'CCC_ADD_1',
    'COMM_TAX_RATE',
    'TAX_METHOD',
    'ST_QTY',
    'ST_UM',
    'ALCOHOL',
    'TAX_AMT_V',
    'AFTER_TAX_QTY',
    'TAX_AMT_V_UM',
    'ORG_COUNTRY',
    'GOV_ASGN_NO',
    'GOV_ASGN_NO2',
    'GOV_ASGN_NO3',
    'GOV_ASGN_NO4',
    'GOV_ASGN_NO5',
    'GOV_ASGN_NO6',
    'GOV_ASGN_NO7',
    'GOV_ASGN_NO8',
    'GOV_ASGN_NO9',
    'GOV_ASGN_NO10',
    'EXP_NO',
    'EXP_SEQ_NO',
    'EXP_NO2',
    'EXP_SEQ_NO2',
    'EXP_NO3',
    'EXP_SEQ_NO3',
    'EXP_NO4',
    'EXP_SEQ_NO4',
    'EXP_NO5',
    'EXP_SEQ_NO5',
    'org_DCL_NO',
    'org_DCL_NO_ITEM',
    'org_EXP_DCL_NO',
    'org_EXP_DCL_ITEM',
    'PO',
    'PO_ITEM',
    'P_QTY',
    'P_UM',
    'ISCALC_WT',
    'SALES_TAX',
    'NET_WT',
    'INN',
    'IND',
    'RER',
    'LOT',
    'CustSref',
    'AtaRef',
    'EXAM_CODE',
    'DOMESTIC_RATE',
    'LUXURY_TAX_RATE',
    'LUXURY_THRESHOLD',
    'WIDE',
    'WIDE_UM',
    'LENGT_',
    'LENGTH_UM',
    'BONDED_QTY',
    'BONDED_UM',
    'AFTER_TAX_AMT_ROR',
    'ROR_MANU',
    'ORIGIN_CERTIFICATE_NO',
    'ORIGIN_CERTIFICATE_ITEM',
    'OTHER_TAX_ID_1',
    'OTHER_TAX_ID_2',
    'OTHER_TAX_ID_3',
    'OTHER_TAX_ID_4',
    'OTHER_TAX_ID_5',
    'OTHER_TAX_ID_6',
    'OTHER_TAX_ID_7',
    'OTHER_TAX_ID_8',
    'OTHER_TAX_ID_9',
    'remark_01',
    'remark_02',
    'remark_03',
    'remark_04',
    'remark_05',
    'remark_06',
    'remark_07',
    'remark_08',
    'remark_09',
    'remark_10'
  ];

  // ✅ 固定值（只放確認永遠固定的）
  const HEAD_DEFAULTS = {
      DCL_COMP_ID: 'B',              // 報關分公司
      BROKER_BOX_NO: '709',          // 箱號
      LICENCED_AGENT_NO: '00755',    // 專責代碼
      COMBINE_DECLAR: 'N',           // 單證合一註記節點
      AIR_SEA: '4',                  // 海空運別
      TRANS_VIA: '42',               // 運輸方式
      WAREHOUSE: 'C2051',            // 卸存地一
      CO_PACKING_NOTE: 'N',          // 合成註記
      APP_PERMIT: 'N',               // 已否簽證
      STOCK_IN_CTN: '0',             // 本批來倉件數
      DOC_RELATIONS: '135',          // 特殊關係
      MESSAGE_TYPE: '9',             // 異動別
      DCL_DOC_NO: 'CX/  /15/709 /',   // 報單號碼(當年度)
  };


  // ========== 0-1) 強制對接 mapping（避免不同版本 xmlHandler 的 mapping 缺漏/寫法不一致） ==========
  // Head：XML欄位名 -> 系統欄位ID
  const HEAD_SYSID_BY_XML = {
    DOC_HEAD_DOC_NO: 'FILE_NO',
    P_DOC_ITEM_FRN: 'CAL_IP_TOT_ITEM_AMT',
    COPY_NUM: 'COPY_QTY',
    DOC_IMP_DATE: 'ARRIVAL_DATE',
    DCL_DATE: 'ACCEPTANCE_DATE',
    DOC_EXP_DATE: 'EXIT_DATE',
    FLY_NO: 'JOURNEY_ID',
    FROM_CODE: 'LOADING_LOCATION'
  };

  // Head：系統欄位ID -> XML欄位名
  const HEAD_XML_BY_SYSID = {
    FILE_NO: 'DOC_HEAD_DOC_NO',
    CAL_IP_TOT_ITEM_AMT: 'P_DOC_ITEM_FRN',
    COPY_QTY: 'COPY_NUM',
    ARRIVAL_DATE: 'DOC_IMP_DATE',
    ACCEPTANCE_DATE: 'DCL_DATE',
    EXIT_DATE: 'DOC_EXP_DATE',
    JOURNEY_ID: 'FLY_NO',
    LOADING_LOCATION: 'FROM_CODE'
  };

  // Item：XML欄位名 -> 系統 className
  const ITEM_CLASS_BY_XML = {
    GOODS_BRAND: 'TRADE_MARK',
    TAX_RATE_P: 'TAX_RATE',
    TAX_METHOD: 'ST_MTD',
    SUB_CCC_CODE: 'TARIFF_CODE',
    ORIGIN_CERTIFICATE_NO: 'CERT_NO',
    ORIGIN_CERTIFICATE_ITEM: 'CERT_NO_ITEM',
    org_EXP_DCL_NO: 'ORG_IMP_DCL_NO',
    org_EXP_DCL_ITEM: 'ORG_IMP_DCL_NO_ITEM',
    BUYER_ITEM_CODE: 'SELLER_ITEM_CODE'
    // 其餘同名欄位（如 GOODS_MODEL / GOODS_SPEC ...）不需要寫
  };

  // Item：系統 className -> XML欄位名
  const ITEM_XML_BY_CLASS = {
    TRADE_MARK: 'GOODS_BRAND',
    TAX_RATE: 'TAX_RATE_P',
    ST_MTD: 'TAX_METHOD',
    TARIFF_CODE: 'SUB_CCC_CODE',
    CERT_NO: 'ORIGIN_CERTIFICATE_NO',
    CERT_NO_ITEM: 'ORIGIN_CERTIFICATE_ITEM',
    ORG_IMP_DCL_NO: 'org_EXP_DCL_NO',
    ORG_IMP_DCL_NO_ITEM: 'org_EXP_DCL_ITEM'
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
  
    // 先套用本檔強制 mapping（優先度最高）
    Object.keys(HEAD_SYSID_BY_XML).forEach(xmlName => {
      rev[xmlName] = HEAD_SYSID_BY_XML[xmlName];
    });
  
    // 再補：headerToXmlNameMap（系統ID -> XML名）反推
    if (typeof window.headerToXmlNameMap === 'object' && window.headerToXmlNameMap) {
      Object.keys(window.headerToXmlNameMap).forEach(sysId => {
        const xmlName = window.headerToXmlNameMap[sysId];
        if (xmlName && !rev[xmlName]) rev[xmlName] = sysId;
      });
    }
  
    // 再補：xmlHeaderNameMap（XML名 -> 系統ID）
    if (typeof window.xmlHeaderNameMap === 'object' && window.xmlHeaderNameMap) {
      Object.keys(window.xmlHeaderNameMap).forEach(xmlName => {
        const sysId = window.xmlHeaderNameMap[xmlName];
        if (sysId) rev[xmlName] = sysId; // 這個屬於直接對應，允許覆蓋
      });
    }
  
    return rev;
  }

  // ========== 3) 反查：Item XML欄位名 -> 系統 className ==========
  function buildItemReverseMap() {
    const rev = {};

    // 先套用本檔強制 mapping（優先度最高）
    Object.keys(ITEM_CLASS_BY_XML).forEach(xmlName => {
      rev[xmlName] = ITEM_CLASS_BY_XML[xmlName];
    });

    // xmlItemNameMap：XML名 -> 系統class（允許覆蓋）
    if (typeof window.xmlItemNameMap === 'object' && window.xmlItemNameMap) {
      Object.keys(window.xmlItemNameMap).forEach(xmlName => {
        const cls = window.xmlItemNameMap[xmlName];
        if (cls) rev[xmlName] = cls;
      });
    }

    // itemToXmlNameMap：系統class -> XML名（反推，不覆蓋已存在）
    if (typeof window.itemToXmlNameMap === 'object' && window.itemToXmlNameMap) {
      Object.keys(window.itemToXmlNameMap).forEach(cls => {
        const xmlName = window.itemToXmlNameMap[cls];
        if (xmlName && !rev[xmlName]) rev[xmlName] = cls;
      });
    }

    // 再補：本檔 class -> XML 的反推（不覆蓋已存在）
    Object.keys(ITEM_XML_BY_CLASS).forEach(cls => {
      const xmlName = ITEM_XML_BY_CLASS[cls];
      if (xmlName && !rev[xmlName]) rev[xmlName] = cls;
    });

    return rev;
  }

  // ========== 4) Head 取值 ==========
  function getHeadValue(xmlFieldName, headRevMap = {}) {
    // ✅ 一對二：HAWB 取 LOT_NO（若 HAWB 本身有值就優先用 HAWB）
    if (xmlFieldName === 'HAWB') {
    
      // 若 UI 真的有 HAWB 欄位且有值，先尊重它
      const hawbEl = document.getElementById('HAWB');
      const hawbVal = hawbEl ? String(hawbEl.value ?? '').trim() : '';
      if (hawbVal) return hawbVal;
    
      // 否則一律用 LOT_NO 的值
      const lotEl = document.getElementById('LOT_NO');
      const lotVal = lotEl ? String(lotEl.value ?? '').trim() : '';
    
      if (lotVal !== '') return lotVal;
    
      // 最後才補：匯入暫存（避免 round-trip 掉值）
      const extraHead = window.__IMPORT_XML_EXTRA__?.head;
      if (extraHead && extraHead.HAWB != null) return String(extraHead.HAWB).trim();
    
      return '';
    }

    // ✅ 一對二：SHPR_CODE 取 SHPR_BAN_ID（若 SHPR_CODE 本身有值就優先用）
    if (xmlFieldName === 'SHPR_CODE') {
    
      // 若 UI 上真的有 SHPR_CODE 且有值 → 優先用
      const codeEl = document.getElementById('SHPR_CODE');
      const codeVal = codeEl ? String(codeEl.value ?? '').trim() : '';
      if (codeVal) return codeVal;
    
      // 否則用 SHPR_BAN_ID
      const banEl = document.getElementById('SHPR_BAN_ID');
      const banVal = banEl ? String(banEl.value ?? '').trim() : '';
      if (banVal) return banVal;
    
      // 最後補匯入暫存
      const extraHead = window.__IMPORT_XML_EXTRA__?.head;
      if (extraHead && extraHead.SHPR_CODE != null) {
        return String(extraHead.SHPR_CODE).trim();
      }
    
      return '';
    }
    
    // 特例：DOC_HEAD_DOC_NO 直接取 FILE_NO；若空，再走 defaults/extra
    if (xmlFieldName === 'DOC_HEAD_DOC_NO') {
      const el = document.getElementById('FILE_NO');
      const v = el ? String(el.value ?? '').trim() : '';
      if (v !== '') return v;
      if (HEAD_DEFAULTS[xmlFieldName] != null) return String(HEAD_DEFAULTS[xmlFieldName]).trim();
      const extraHead = window.__IMPORT_XML_EXTRA__?.head;
      if (extraHead && extraHead[xmlFieldName] != null) return String(extraHead[xmlFieldName]).trim();
      return '';
    }

    // (a) 若剛好 ID 同名（少數可能）
    const same = document.getElementById(xmlFieldName);
    if (same && 'value' in same) {
      const v = String(same.value ?? '').trim();
      if (v !== '') return v;
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

    // ✅ 若 UI 取不到值 → 先用固定值
    if (HEAD_DEFAULTS[xmlFieldName] != null) {
      return String(HEAD_DEFAULTS[xmlFieldName]).trim();
    }

    // ✅ 再用匯入時暫存補回（避免 UI 沒欄位造成 round-trip 掉值）
    const extraHead = window.__IMPORT_XML_EXTRA__?.head;
    if (extraHead && extraHead[xmlFieldName] != null) {
      return String(extraHead[xmlFieldName]).trim();
    }

    return '';
  }

  // ========== 5) Item 取值 ==========
  function getItemValue(itemRow, xmlFieldName, itemRevMap) {
    // ITEM_NO：沿用系統「勾選則 *，否則連號」習慣
    if (xmlFieldName === 'ITEM_NO') return null; // 外面統一處理

    // ✅ 特例：SALES_TAX 由「報單類別(DCL_DOC_TYPE) + 納稅辦法(ST_MTD)」判斷覆寫
    if (xmlFieldName === 'SALES_TAX') {
      // 報單類別（Head）
      const docType = String(getHeadValue('DCL_DOC_TYPE', buildHeadReverseMap()) || '')
        .trim()
        .toUpperCase();

      // 納稅辦法（Item：TAX_METHOD -> ST_MTD）
      const stMtd = String(itemRow.querySelector('.ST_MTD')?.value || '')
        .trim()
        .toUpperCase();

      const key = `${docType}-${stMtd}`;
      const ok = (
        key === 'G7-55' ||
        key === 'G7-99' ||
        key === 'B6-56' ||
        key === 'B6-58' ||
        key === 'B6-5C' ||
        key === 'B6-5Y'
      );

      return ok ? 'T' : 'F';
    }

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
      const v = (HEAD_DEFAULTS[f] != null)
        ? String(HEAD_DEFAULTS[f]).trim()    // ✅ 直接用固定值寫進 XML
        : getHeadValue(f, headRevMap);       // 其他欄位才照原本流程取值
    
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

        // ✅ 若 UI 取不到值，且匯入時有暫存，就用暫存補回
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
  
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  
    // ✅ 防止這個函式被重複呼叫後，多綁一次
    if (newBtn.dataset.importXmlExportBound === '1') return;
    newBtn.dataset.importXmlExportBound = '1';
  
    newBtn.addEventListener('click', async (e) => {
      e.preventDefault();
  
      // ✅ 最關鍵：阻止同一顆按鈕上的其他 click listener 繼續執行
      e.stopImmediatePropagation();
      e.stopPropagation();
  
      // ✅ 一次點擊鎖：同一次點擊（或極短時間內）只允許跑一次
      const now = Date.now();
      const last = Number(newBtn.dataset.lastClickTs || 0);
      if (now - last < 800) return; // 800ms 內視為同一次/連續觸發
      newBtn.dataset.lastClickTs = String(now);
  
      try {
        // 先跑原本系統檢查：若有 alert → 中止（但要阻止它真的下載）
        if (typeof window.exportToXML === 'function') {
          let blocked = false;

        // 1) 攔 alert：只有真正錯誤才中止匯出
        const originalAlert = window.alert;
        window.alert = function (msg) {

          const text = String(msg ?? '');

          // 如果是「提示（不中止匯出）」就放行
          const isHint =
            text.includes('不中止匯出') ||
            text.includes('提示（不中止匯出）') ||
            text.includes('提示 (不中止匯出)');

          if (!isHint) {
            blocked = true;   // 只有真正錯誤才阻擋
          }

          originalAlert(msg);
        };

          // 2) 暫時封鎖「原本匯出」所有常見下載途徑
          const originalDownloadText = window.downloadText;
          const originalSaveAs = window.saveAs;
          window.downloadText = function () {};
          window.saveAs = function () {};

          // 3) 封鎖 <a download> 的 click（很多版本就是這樣下載）
          const originalAnchorClick = HTMLAnchorElement.prototype.click;
          HTMLAnchorElement.prototype.click = function () {
            try {
              // 只封鎖「下載型」的 click：有 download 屬性或 blob URL
              const href = String(this.getAttribute('href') || this.href || '');
              const hasDownload = this.hasAttribute('download') || !!this.download;
              const isBlob = href.startsWith('blob:') || href.startsWith('data:application/xml');

              if (hasDownload || isBlob) {
                // 直接阻止下載
                return;
              }
            } catch (e) {}
            return originalAnchorClick.apply(this, arguments);
          };

          try {
            await window.exportToXML();
          } catch (err) {
            console.warn('[importXmlExportPlugin] 原 exportToXML 例外，已略過原下載，改用外掛匯出：', err);
            // 例外不擋外掛
          } finally {
            // 還原
            window.alert = originalAlert;
            window.downloadText = originalDownloadText;
            window.saveAs = originalSaveAs;
            HTMLAnchorElement.prototype.click = originalAnchorClick;
          }

          // 原系統檢查沒過 → 外掛也中止
          if (blocked) return;
        }
  
        // 檢查通過 → 外掛匯出
        const xml = buildImportXml();
  
        // ===== 檔名：HAWB + SHPR_CODE + SHPR_C_NAME =====
        const headRevMapForName = buildHeadReverseMap();

        // 依你既有邏輯取值（UI → 一對二 → extra）
        const hawb = (
          document.getElementById('HAWB')?.value ||
          getHeadValue('HAWB', headRevMapForName) ||
          ''
        ).trim();

        const shprCode = (
          document.getElementById('SHPR_CODE')?.value ||
          getHeadValue('SHPR_CODE', headRevMapForName) ||
          ''
        ).trim();

        const shprCName = (
          document.getElementById('SHPR_C_NAME')?.value ||
          getHeadValue('SHPR_C_NAME', headRevMapForName) ||
          ''
        ).trim();

        // 檔名安全化
        const safe = (s) => String(s || '')
          .replace(/[\\/:*?"<>|]/g, '-')  // Windows 禁用字元
          .replace(/\s+/g, '')           // 移除空白（若想保留改成 '_'）
          .replace(/[　]/g, '')          // 全形空白
          .slice(0, 50);                 // 每段長度限制

        const baseName = [
          safe(hawb),
          safe(shprCode),
          safe(shprCName)
        ].filter(Boolean).join('_') || 'import';

        const filename = `${baseName}.xml`;

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
