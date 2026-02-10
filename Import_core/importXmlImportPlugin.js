(() => {
  // ====== 工具：XML escape/unescape ======
  const unescapeXmlFn =
    (typeof window.unescapeXml === 'function')
      ? window.unescapeXml
      : (s) => String(s ?? '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&');


  // ====== 清除按鈕（右側 X）在匯入期間的顯示控制 ======
  // 目的：匯入 XML 時會大量 dispatch input/change 觸發清除鈕顯示邏輯，導致 X 常駐。
  // 做法：匯入期間先「凍結/隱藏」，匯入結束後清除可能被寫入的 inline/class，回到原本「聚焦才顯示」行為。
  function ensureImportClearBtnStyle() {
    const styleId = '__import_clearbtn_style__';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
    // 匯入期間：強制隱藏所有常見清除鈕 class（不修改你的原 CSS 檔，只由 JS 注入）
    style.textContent = `
      html.__importing_xml__ .clear-btn,
      html.__importing_xml__ .clear-button,
      html.__importing_xml__ .btn-clear,
      html.__importing_xml__ .input-clear,
      html.__importing_xml__ .x-btn,
      html.__importing_xml__ .x-clear,
      html.__importing_xml__ button[aria-label="clear"],
      html.__importing_xml__ button[title*="清除"],
      html.__importing_xml__ button[title*="Clear"] {
        opacity: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function cleanupClearButtonsAfterImport() {
    const selectors = [
      '.clear-btn',
      '.clear-button',
      '.btn-clear',
      '.input-clear',
      '.x-btn',
      '.x-clear',
      'button[aria-label="clear"]',
      'button[title*="清除"]',
      'button[title*="Clear"]'
    ];

    document.querySelectorAll(selectors.join(',')).forEach(btn => {
      // 清掉可能被「有值就顯示」邏輯寫入的 inline style
      btn.style.display = '';
      btn.style.opacity = '';
      btn.style.visibility = '';
      btn.style.pointerEvents = '';

      // 清掉常見強制顯示 class（如果你的專案用其他 class 不會受影響）
      ['show', 'shown', 'visible', 'active', 'on', 'open', 'is-visible'].forEach(c => btn.classList.remove(c));
    });
  }

  function setImportingFlag(flag) {
    window.__IS_IMPORTING__ = !!flag;
    document.documentElement.classList.toggle('__importing_xml__', !!flag);
    if (flag) {
      ensureImportClearBtnStyle();
      // 開始匯入先把目前畫面上已經亮起的 X 收起來
      cleanupClearButtonsAfterImport();
    } else {
      // 匯入結束：把可能被打開的 X 收回，回到原本 CSS/互動控制
      cleanupClearButtonsAfterImport();
    }
  }

  // ====== 判斷是否為「進口最終 XML」(樣板結構) ======
  function isFinalImportXml(xmlDoc) {
    try {
      const headTable = xmlDoc.getElementsByTagName('head_table_name')?.[0]?.textContent?.trim();
      const detailTable = xmlDoc.getElementsByTagName('detail_table_name')?.[0]?.textContent?.trim();
      return headTable === 'DOC_H_I' && detailTable === 'DI_INVBD';
    } catch {
      return false;
    }
  }

  // ====== 外掛版匯入：只接管最終進口 XML ======
  function importFinalImportXML(event) {
    // 若不是檔案 change 事件就回原本
    const file = event?.target?.files?.[0];
    if (!file) {
      if (typeof window.importXML === 'function') window.importXML(event);
      return;
    }

    // ✅ 匯入開始：凍結清除按鈕（右側 X）的顯示更新
    setImportingFlag(true);

    const reader = new FileReader();
    reader.onload = function (e) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(e.target.result, 'application/xml');

      // 不是進口最終 XML → 回原本 importXML
      if (!isFinalImportXml(xmlDoc)) {
        // 非進口最終 XML：解除匯入旗標後走原本流程
        setImportingFlag(false);
        if (typeof window.importXML === 'function') window.importXML(event);
        return;
      }

      // ====== (A) 先清空（沿用原本行為） ======
      if (typeof window.clearField === 'function') window.clearField();
      const calcStatus = document.getElementById('calculation-status');
      if (calcStatus) calcStatus.value = '';

      // ====== (B) 檔名帶入 FILE_NO / REMARK（沿用原本行為） ======
      const match = file.name.match(/^\d+/);
      const fileNumber = match ? match[0] : '';
      const fileNoEl = document.getElementById('FILE_NO');
      if (fileNoEl) fileNoEl.value = fileNumber;

      const matchRemark = file.name.match(/【(.*?)】/);
      const fileRemark = matchRemark ? matchRemark[1] : '';
      const remarkEl = document.getElementById('REMARK');
      if (remarkEl) remarkEl.value = fileRemark;

      // ====== (C) 解析表頭 ======
      const headerFields =
        xmlDoc.getElementsByTagName('head')[0]?.getElementsByTagName('fields') || [];

      Array.from(headerFields).forEach(field => {
        const nameNode = field.getElementsByTagName('field_name')[0];
        if (!nameNode) return;

        const valueNode = field.getElementsByTagName('field_value')[0];
        if (!valueNode || !valueNode.textContent) return;

        const rawName = nameNode.textContent.trim();

        // 使用原本的 xmlHeaderNameMap（XML名 → 系統ID），沒有就同名
        const mappedName =
          (typeof window.xmlHeaderNameMap === 'object' && window.xmlHeaderNameMap && window.xmlHeaderNameMap[rawName])
            ? window.xmlHeaderNameMap[rawName]
            : rawName;

        const fieldValue = unescapeXmlFn(valueNode.textContent);
        const el = document.getElementById(mappedName);
        if (el) el.value = fieldValue;
      });

      // 原本匯入後會跑的流程（保留）
      if (typeof window.searchData === 'function') window.searchData(false);
      if (typeof window.lookupExchangeRate === 'function') window.lookupExchangeRate();
      if (typeof window.handleCheck === 'function') window.handleCheck();
      if (typeof window.thingsToNote === 'function') window.thingsToNote();

      // 觸發必填/不得填列的 input 檢核（原本就有）
      document.getElementById('CNEE_COUNTRY_CODE')?.dispatchEvent(new Event('input'));
      document.getElementById('TERMS_SALES')?.dispatchEvent(new Event('input'));

      // ====== (D) 解析項次 ======
      const items =
        xmlDoc.getElementsByTagName('detail')[0]?.getElementsByTagName('items') || [];

      const itemContainer = document.getElementById('item-container');
      if (!itemContainer) return;

      itemContainer.innerHTML = '';
      if (typeof window.itemCount !== 'undefined') window.itemCount = 0;

      // ★ 這裡做「匯入轉換關鍵」：避免 BUYER_ITEM_CODE 被映到 SELLER_ITEM_CODE
      const localXmlItemNameMap = { ...(window.xmlItemNameMap || {}) };
      if (localXmlItemNameMap.BUYER_ITEM_CODE === 'SELLER_ITEM_CODE') {
        delete localXmlItemNameMap.BUYER_ITEM_CODE; // 讓 BUYER_ITEM_CODE 沒對應就自然略過/空值（不覆蓋賣方料號）
      }

      Array.from(items).forEach(item => {
        const itemData = {};
        const fields = item.getElementsByTagName('fields');

        Array.from(fields).forEach(field => {
          const nameNode = field.getElementsByTagName('field_name')[0];
          if (!nameNode) return;

          const rawName = nameNode.textContent.trim();
          const mappedName = localXmlItemNameMap[rawName] || rawName;

          const valueNode = field.getElementsByTagName('field_value')[0];
          const fieldValue = valueNode && valueNode.textContent
            ? unescapeXmlFn(valueNode.textContent)
            : '';

          itemData[mappedName] = fieldValue;
        });

        // 沿用原本 createItemRow
        if (typeof window.createItemRow === 'function') {
          const itemRow = window.createItemRow(itemData);
          itemContainer.appendChild(itemRow);
        }
      });

      // 匯入後收尾（原本就有）
      if (typeof window.updateCneeCNameVisibility === 'function') window.updateCneeCNameVisibility();
      if (typeof window.initializeListeners === 'function') window.initializeListeners();
      if (typeof window.renumberItems === 'function') window.renumberItems();
      if (typeof window.updateRemark1FromImport === 'function') window.updateRemark1FromImport();

      // ✅ 匯入完成：解除匯入旗標，讓清除按鈕回到原本「聚焦才顯示」
      setImportingFlag(false);
    };

    reader.onerror = function () {
      setImportingFlag(false);
    };
    reader.onabort = function () {
      setImportingFlag(false);
    };

    reader.readAsText(file, 'UTF-8');
  }

  // ====== 取代原本匯入：clone input 移除舊 listener，再綁外掛 ======
  function replaceImportHandler() {
    const input = document.getElementById('import-xml');
    if (!input) return;

    // 保留原本 importXML（供非最終格式 fallback 用）
    const original = window.importXML;

    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);

    // 讓外掛內部可以呼叫到原本的
    window.importXML = original;

    newInput.addEventListener('change', importFinalImportXML, false);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceImportHandler);
  } else {
    replaceImportHandler();
  }
})();
