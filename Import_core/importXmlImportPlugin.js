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
    // 你系統中常見會觸發很多連動的表頭欄位
    const headIds = [
      'SHPR_BAN_ID',
      'SHPR_E_NAME',
      'CNEE_BAN_ID',
      'CNEE_E_NAME',
      'CNEE_COUNTRY_CODE',
      'TERMS_SALES',
      'CURRENCY',
      'DCL_DOC_TYPE',
      'DOC_CTN_UM',
      'DOC_OTR_DESC',
      'REMARK1',
      'ORG_COUNTRY',
      'WIDE_UM',
      'LENGTH_UM'
    ];

    headIds.forEach(id => dispatchInputAndChange(document.getElementById(id)));
  }

  function triggerItemConversions() {
    const rows = document.querySelectorAll('#item-container .item-row');
    rows.forEach(row => {
      // 這些欄位通常會觸發：ST_UM 查表、MTK 自動長度、ST_QTY 計算、金額重算、格式清洗
      const selectors = [
        '.CCC_CODE',
        '.QTY',
        '.DOC_UM',
        '.DOC_UNIT_P',
        '.DOC_TOT_P',
        '.WIDE', '.WIDE_UM',
        '.LENGT_', '.LENGTH_UM',
        '.ST_MTD',
        '.ST_QTY',
        '.ORG_COUNTRY',
        '.SELLER_ITEM_CODE'
      ];

      selectors.forEach(sel => dispatchInputAndChange(row.querySelector(sel)));
    });
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

      // ====== (A) 先清空（沿用原本行為） ======
      if (typeof window.clearField === 'function') window.clearField();
      const calcStatus = document.getElementById('calculation-status');
      if (calcStatus) calcStatus.value = '';

      // ====== (B) 檔名帶入 FILE_NO / REMARK（沿用原本行為） ======
      const match = file.name.match(/^\d+/);
      const fileNumber = match ? match[0] : '';
      const fileNoEl = document.getElementById('FILE_NO');
      if (fileNoEl) {
        fileNoEl.value = fileNumber;
        dispatchInputAndChange(fileNoEl);
      }

      const matchRemark = file.name.match(/【(.*?)】/);
      const fileRemark = matchRemark ? matchRemark[1] : '';
      const remarkEl = document.getElementById('REMARK');
      if (remarkEl) {
        remarkEl.value = fileRemark;
        dispatchInputAndChange(remarkEl);
      }

      // ====== (C) 解析表頭 ======
      const headerFields =
        xmlDoc.getElementsByTagName('head')[0]?.getElementsByTagName('fields') || [];

      Array.from(headerFields).forEach(field => {
        const nameNode = field.getElementsByTagName('field_name')[0];
        if (!nameNode) return;

        const valueNode = field.getElementsByTagName('field_value')[0];
        if (!valueNode || valueNode.textContent == null) return;

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
          dispatchInputAndChange(el); // ✅ 觸發原本的轉換/連動
        }
      });

      // ✅ 再補一次「關鍵表頭欄位」的轉換觸發（避免某些欄位在 mapping 中沒對到）
      triggerHeadConversions();

      // 原本匯入後會跑的流程（保留）
      if (typeof window.searchData === 'function') window.searchData(false);
      if (typeof window.lookupExchangeRate === 'function') window.lookupExchangeRate();
      if (typeof window.handleCheck === 'function') window.handleCheck();
      if (typeof window.thingsToNote === 'function') window.thingsToNote();

      // ====== (D) 解析項次 ======
      const items =
        xmlDoc.getElementsByTagName('detail')[0]?.getElementsByTagName('items') || [];

      const itemContainer = document.getElementById('item-container');
      if (!itemContainer) return;

      itemContainer.innerHTML = '';
      if (typeof window.itemCount !== 'undefined') window.itemCount = 0;

      // ★ 避免 BUYER_ITEM_CODE 覆蓋 SELLER_ITEM_CODE
      const localXmlItemNameMap = { ...(window.xmlItemNameMap || {}) };
      if (localXmlItemNameMap.BUYER_ITEM_CODE === 'SELLER_ITEM_CODE') {
        delete localXmlItemNameMap.BUYER_ITEM_CODE;
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
          const fieldValue = valueNode && valueNode.textContent != null
            ? unescapeXmlFn(valueNode.textContent)
            : '';

          itemData[mappedName] = fieldValue;
        });

        if (typeof window.createItemRow === 'function') {
          const itemRow = window.createItemRow(itemData);
          itemContainer.appendChild(itemRow);

          // ✅ 立刻觸發該列關鍵欄位的轉換
          // 先觸發 CCC_CODE（通常會帶出 ST_UM / 稅率 / 統計單位等）
          dispatchInputAndChange(itemRow.querySelector('.CCC_CODE'));
          // 再觸發數量/單價等會牽動計算的欄位
          dispatchInputAndChange(itemRow.querySelector('.QTY'));
          dispatchInputAndChange(itemRow.querySelector('.DOC_UM'));
          dispatchInputAndChange(itemRow.querySelector('.DOC_UNIT_P'));
          dispatchInputAndChange(itemRow.querySelector('.WIDE'));
          dispatchInputAndChange(itemRow.querySelector('.WIDE_UM'));
          dispatchInputAndChange(itemRow.querySelector('.LENGT_'));
          dispatchInputAndChange(itemRow.querySelector('.LENGTH_UM'));
        }
      });

      // 匯入後收尾（原本就有）
      if (typeof window.updateCneeCNameVisibility === 'function') window.updateCneeCNameVisibility();
      if (typeof window.initializeListeners === 'function') window.initializeListeners();
      if (typeof window.renumberItems === 'function') window.renumberItems();
      if (typeof window.updateRemark1FromImport === 'function') window.updateRemark1FromImport();

      // ✅ 初始化 listener 後再跑一次整體 item 轉換（確保監聽已就緒）
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
