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


  // ====== 清除按鈕（右側 X）顯示控制：強制「只在聚焦時」才顯示 ======
  // 目的：避免匯入時大量 dispatch input/change 導致清除按鈕常駐顯示
  // 做法：掃描可能的清除按鈕元素，預設一允隱藏；當 input/textarea focus 時才顯示同一容器內的清除按鈕
  window.__FORCE_CLEARBTN_FOCUS_ONLY__ = true;

  function _isClearButtonCandidate(el) {
    if (!el || el.nodeType !== 1) return false;
    const tag = el.tagName;
    if (!['BUTTON', 'SPAN', 'A', 'DIV', 'I'].includes(tag)) return false;

    const cls = (el.className || '').toString();
    const txt = (el.textContent || '').trim();

    const looksLikeX = (txt === '×' || txt === '✕' || txt === 'x' || txt === 'X');
    const looksLikeClearClass = /clear|btn-clear|input-clear|x-btn|x-clear|icon-clear/i.test(cls);

    // 避免把真的文字內容當成清除鈕
    if (!looksLikeX && !looksLikeClearClass) return false;

    // 必須在某個含 input/textarea 的容器裡
    const container = el.closest('div,td,th,label,span,section,article') || el.parentElement;
    if (!container) return false;
    const hasInput = container.querySelector && container.querySelector('input,textarea');
    return !!hasInput;
  }

  function _getFieldContainer(el) {
    // 找一個包含 input 的最近容器
    const candidates = el.closest('[data-field],.field-row,.input-row,.form-row,.field,.input-group,.form-group,td,th,div,label,span,section') || el.parentElement;
    return candidates || null;
  }

  function _hideClearButtonsIn(container) {
    if (!container || !container.querySelectorAll) return;
    container.querySelectorAll('button,span,a,div,i').forEach(btn => {
      if (_isClearButtonCandidate(btn)) {
        btn.dataset.__clearManaged = '1';
        // 用 inline 強制收起（避免被其他 JS/樣式打開）
        btn.style.opacity = '0';
        btn.style.pointerEvents = 'none';
        btn.style.visibility = 'hidden';
      }
    });
  }

  function _showClearButtonsIn(container) {
    if (!container || !container.querySelectorAll) return;
    container.querySelectorAll('button,span,a,div,i').forEach(btn => {
      if (_isClearButtonCandidate(btn)) {
        btn.dataset.__clearManaged = '1';
        btn.style.opacity = '';
        btn.style.pointerEvents = '';
        btn.style.visibility = '';
      }
    });
  }

  function _scanAndHideAllClearButtons() {
    document.querySelectorAll('button,span,a,div,i').forEach(el => {
      if (_isClearButtonCandidate(el)) {
        const c = _getFieldContainer(el);
        _hideClearButtonsIn(c || el.parentElement);
      }
    });
  }

  function setupFocusOnlyClearButtonsController() {
    if (window.__CLEARBTN_FOCUS_CONTROLLER_READY__) return;
    window.__CLEARBTN_FOCUS_CONTROLLER_READY__ = true;

    // 初始先全部收起
    _scanAndHideAllClearButtons();

    // focusin：只顯示目前聚焦欄位的清除鈕
    document.addEventListener('focusin', (e) => {
      if (!window.__FORCE_CLEARBTN_FOCUS_ONLY__) return;
      const t = e.target;
      if (!t || !(t.matches && t.matches('input,textarea'))) return;

      // 先全部收起，再打開該容器
      _scanAndHideAllClearButtons();
      const container = _getFieldContainer(t);
      if (container) _showClearButtonsIn(container);
    }, true);

    // focusout：離開後收起（用 setTimeout 避免 focus 移到同容器內另一元素）
    document.addEventListener('focusout', () => {
      if (!window.__FORCE_CLEARBTN_FOCUS_ONLY__) return;
      setTimeout(() => {
        const ae = document.activeElement;
        if (!ae || !(ae.matches && ae.matches('input,textarea'))) {
          _scanAndHideAllClearButtons();
        }
      }, 0);
    }, true);

    // MutationObserver：有人把清除鈕打開時，若不是聚焦狀態就立刻收回
    const mo = new MutationObserver(() => {
      if (!window.__FORCE_CLEARBTN_FOCUS_ONLY__) return;
      const ae = document.activeElement;
      const focusedContainer = (ae && ae.matches && ae.matches('input,textarea')) ? _getFieldContainer(ae) : null;

      document.querySelectorAll('[data-__clearManaged="1"]').forEach(btn => {
        const c = _getFieldContainer(btn);
        const shouldBeVisible = focusedContainer && c === focusedContainer;
        if (!shouldBeVisible) {
          btn.style.opacity = '0';
          btn.style.pointerEvents = 'none';
          btn.style.visibility = 'hidden';
        }
      });
    });
    mo.observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'style'] });
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

    const reader = new FileReader();
    reader.onload = function (e) {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(e.target.result, 'application/xml');

      // 不是進口最終 XML → 回原本 importXML
      if (!isFinalImportXml(xmlDoc)) {
        if (typeof window.importXML === 'function') window.importXML(event);
        return;
      }

      // ✅ 匯入期間：避免清除按鈕（右側 X）常駐顯示
      window.__IS_IMPORTING__ = true;
      window.__FORCE_CLEARBTN_FOCUS_ONLY__ = true;
      if (typeof setupFocusOnlyClearButtonsController === 'function') setupFocusOnlyClearButtonsController();
      // 匯入開始先全部收起一次
      try { _scanAndHideAllClearButtons(); } catch (_) {}

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

      // ✅ 匯入完成：恢復為「只有聚焦才顯示」並強制全部收起
      window.__IS_IMPORTING__ = false;
      window.__FORCE_CLEARBTN_FOCUS_ONLY__ = true;
      try {
        // 匯入後通常沒有聚焦，先收起全部清除鈕
        _scanAndHideAllClearButtons();
        // 同時 blur，避免 focus-within 卡住
        document.activeElement?.blur?.();
      } catch (_) {}

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


  // 啟動清除按鈕聚焦顯示控制
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupFocusOnlyClearButtonsController);
  } else {
    setupFocusOnlyClearButtonsController();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', replaceImportHandler);
  } else {
    replaceImportHandler();
  }
})();
