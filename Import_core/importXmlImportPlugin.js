(() => {
  const unescapeXmlFn =
    (typeof window.unescapeXml === 'function')
      ? window.unescapeXml
      : (s) => String(s ?? '')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&apos;/g, "'")
          .replace(/&amp;/g, '&');

  function ensureImportClearBtnStyle() {
    const styleId = '__import_clearbtn_style__';
    if (document.getElementById(styleId)) return;
    const style = document.createElement('style');
    style.id = styleId;
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
      '.clear-btn','.clear-button','.btn-clear','.input-clear',
      '.x-btn','.x-clear',
      'button[aria-label="clear"]',
      'button[title*="清除"]',
      'button[title*="Clear"]'
    ];
    document.querySelectorAll(selectors.join(',')).forEach(btn => {
      btn.style.display = '';
      btn.style.opacity = '';
      btn.style.visibility = '';
      btn.style.pointerEvents = '';
      ['show','shown','visible','active','on','open','is-visible']
        .forEach(c => btn.classList.remove(c));
    });
  }

  function setImportingFlag(flag) {
    document.documentElement.classList.toggle('__importing_xml__', !!flag);
    if (flag) {
      ensureImportClearBtnStyle();
      cleanupClearButtonsAfterImport();
    } else {
      cleanupClearButtonsAfterImport();
    }
  }

  function isFinalImportXml(xmlDoc) {
    try {
      const headTable = xmlDoc.getElementsByTagName('head_table_name')?.[0]?.textContent?.trim();
      const detailTable = xmlDoc.getElementsByTagName('detail_table_name')?.[0]?.textContent?.trim();
      return headTable === 'DOC_H_I' && detailTable === 'DI_INVBD';
    } catch {
      return false;
    }
  }

  function importFinalImportXML(event) {
    const file = event?.target?.files?.[0];
    if (!file) {
      window.importXML?.(event);
      return;
    }

    setImportingFlag(true);

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(e.target.result, 'application/xml');

        if (!isFinalImportXml(xmlDoc)) {
          window.importXML?.(event);
          return;
        }

        window.clearField?.();
        const calcStatus = document.getElementById('calculation-status');
        if (calcStatus) calcStatus.value = '';

        const match = file.name.match(/^\d+/);
        document.getElementById('FILE_NO')?.value = match ? match[0] : '';

        const headerFields = xmlDoc.getElementsByTagName('head')[0]?.getElementsByTagName('fields') || [];
        Array.from(headerFields).forEach(field => {
          const n = field.getElementsByTagName('field_name')[0];
          const v = field.getElementsByTagName('field_value')[0];
          if (!n || !v) return;
          const raw = n.textContent.trim();
          const mapped = window.xmlHeaderNameMap?.[raw] || raw;
          const el = document.getElementById(mapped);
          if (el) el.value = unescapeXmlFn(v.textContent || '');
        });

        window.searchData?.(false);
        window.lookupExchangeRate?.();
        window.handleCheck?.();
        window.thingsToNote?.();

        document.getElementById('CNEE_COUNTRY_CODE')?.dispatchEvent(new Event('input'));
        document.getElementById('TERMS_SALES')?.dispatchEvent(new Event('input'));

        const items = xmlDoc.getElementsByTagName('detail')[0]?.getElementsByTagName('items') || [];
        const itemContainer = document.getElementById('item-container');
        if (!itemContainer) return;

        itemContainer.innerHTML = '';
        if (typeof window.itemCount !== 'undefined') window.itemCount = 0;

        const localMap = { ...(window.xmlItemNameMap || {}) };
        if (localMap.BUYER_ITEM_CODE === 'SELLER_ITEM_CODE') delete localMap.BUYER_ITEM_CODE;

        Array.from(items).forEach(item => {
          const data = {};
          Array.from(item.getElementsByTagName('fields')).forEach(f => {
            const n = f.getElementsByTagName('field_name')[0];
            const v = f.getElementsByTagName('field_value')[0];
            if (!n) return;
            const raw = n.textContent.trim();
            const mapped = localMap[raw] || raw;
            data[mapped] = v ? unescapeXmlFn(v.textContent || '') : '';
          });
          const row = window.createItemRow?.(data);
          if (row) itemContainer.appendChild(row);
        });

        window.updateCneeCNameVisibility?.();
        window.initializeListeners?.();
        window.renumberItems?.();
        window.updateRemark1FromImport?.();
      } finally {
        setImportingFlag(false);
      }
    };

    reader.onerror = reader.onabort = () => setImportingFlag(false);
    reader.readAsText(file, 'UTF-8');
  }

  function replaceImportHandler() {
    const input = document.getElementById('import-xml');
    if (!input) return;
    const original = window.importXML;
    const newInput = input.cloneNode(true);
    input.parentNode.replaceChild(newInput, input);
    window.importXML = original;
    newInput.addEventListener('change', importFinalImportXML, false);
  }

  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', replaceImportHandler)
    : replaceImportHandler();
})();