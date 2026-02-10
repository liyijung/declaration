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

  function dispatchInputAndChange(el) {
    if (!el) return;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function triggerHeadConversions() {
    const headIds = [
      'FILE_NO','REMARK',
      'SHPR_BAN_ID','SHPR_E_NAME','SHPR_C_NAME',
      'CNEE_BAN_ID','CNEE_E_NAME','CNEE_C_NAME',
      'CNEE_COUNTRY_CODE','TERMS_SALES','CURRENCY',
      'DCL_DOC_TYPE','DOC_CTN_UM',
      'FRT_AMT','INS_AMT','ADD_AMT','SUBTRACT_AMT',
      'DOC_MARKS_DESC','NET_WT'
    ];
    headIds.forEach(id => dispatchInputAndChange(document.getElementById(id)));
  }

  function triggerItemConversions() {
    const rows = document.querySelectorAll('#item-container .item-row');
    rows.forEach(row => {
      const selectors = [
        '.CCC_CODE','.QTY','.DOC_UM','.DOC_UNIT_P','.DOC_TOT_P',
        '.WIDE','.WIDE_UM','.LENGT_','.LENGTH_UM',
        '.ST_MTD','.ST_QTY','.ORG_COUNTRY'
      ];
      selectors.forEach(sel => dispatchInputAndChange(row.querySelector(sel)));
    });
  }


  
  // ✅ 暫存：匯入時遇到 UI 沒有對應欄位的值，先記起來，匯出再吐回
  window.__IMPORT_XML_EXTRA__ = window.__IMPORT_XML_EXTRA__ || { head: {}, items: [] };
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

    const reader = new FileReader();
    reader.onload = function (e) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(e.target.result, 'application/xml');

      // 不是進口最終 XML → 回原本 importXML
      if (!isFinalImportXml(xmlDoc)) {
        if (typeof window.importXML === 'function') window.importXML(event);
        return;
      }

            // ✅ 重置暫存（避免上一次匯入殘留）
      window.__IMPORT_XML_EXTRA__ = { head: {}, items: [] };

      // ====== (A) 先清空（沿用原本行為） ======
      if (typeof window.clearField === 'function') window.clearField();
      const calcStatus = document.getElementById('calculation-status');
      if (calcStatus) calcStatus.value = '';

      // ====== (B) 檔名帶入 FILE_NO / REMARK（沿用原本行為） ======
      const match = file.name.match(/^\d+/);
      const fileNumber = match ? match[0] : '';
      const fileNoEl = document.getElementById('FILE_NO');
      if (fileNoEl) { fileNoEl.value = fileNumber; dispatchInputAndChange(fileNoEl); }

      const matchRemark = file.name.match(/【(.*?)】/);
      const fileRemark = matchRemark ? matchRemark[1] : '';
      const remarkEl = document.getElementById('REMARK');
      if (remarkEl) { remarkEl.value = fileRemark; dispatchInputAndChange(remarkEl); }

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
        if (el) {
          el.value = fieldValue;
          dispatchInputAndChange(el);
        } else {
          window.__IMPORT_XML_EXTRA__.head[rawName] = fieldValue;
        }
});

      triggerHeadConversions();

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
        const itemExtra = {};
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
          itemExtra[rawName] = fieldValue;
        });

        // 沿用原本 createItemRow
        if (typeof window.createItemRow === 'function') {
          const itemRow = window.createItemRow(itemData);
          itemContainer.appendChild(itemRow);
          // ✅ 觸發該列關鍵欄位連動/計算
          dispatchInputAndChange(itemRow.querySelector('.CCC_CODE'));
          dispatchInputAndChange(itemRow.querySelector('.QTY'));
          dispatchInputAndChange(itemRow.querySelector('.DOC_UM'));
          dispatchInputAndChange(itemRow.querySelector('.DOC_UNIT_P'));
          dispatchInputAndChange(itemRow.querySelector('.WIDE'));
          dispatchInputAndChange(itemRow.querySelector('.WIDE_UM'));
          dispatchInputAndChange(itemRow.querySelector('.LENGT_'));
          dispatchInputAndChange(itemRow.querySelector('.LENGTH_UM'));
          window.__IMPORT_XML_EXTRA__.items.push(itemExtra);
        }
      });

      // 匯入後收尾（原本就有）
      if (typeof window.updateCneeCNameVisibility === 'function') window.updateCneeCNameVisibility();
      if (typeof window.initializeListeners === 'function') window.initializeListeners();
      if (typeof window.renumberItems === 'function') window.renumberItems();
      if (typeof window.updateRemark1FromImport === 'function') window.updateRemark1FromImport();
      triggerItemConversions();
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
