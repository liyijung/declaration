// 切換報單表頭與報單項次的tab
document.addEventListener('keydown', function(event) {
    if (event.ctrlKey && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
        const tabLinks = Array.from(document.querySelectorAll('.tab-links'));

        let currentIndex = tabLinks.findIndex(link => link.classList.contains('active'));
        let newIndex;

        if (event.key === 'ArrowLeft') {
            newIndex = (currentIndex > 0) ? currentIndex - 1 : tabLinks.length - 1;
        } else if (event.key === 'ArrowRight') {
            newIndex = (currentIndex < tabLinks.length - 1) ? currentIndex + 1 : 0;
        }

        // 從 onclick 中取得新的 tab 名稱
        const newTabName = tabLinks[newIndex].getAttribute('onclick').match(/'([^']+)'/)[1];
        openTab(newTabName);
        tabLinks[newIndex].focus(); // 將焦點移至新選中的 tab
    }
});

function openTab(tabName) {
    const tabs = document.querySelectorAll(".tab");
    const tabLinks = document.querySelectorAll(".tab-links");

    // 移除所有 active 狀態
    tabs.forEach(tab => tab.classList.remove("active"));
    tabLinks.forEach(link => link.classList.remove("active"));

    // 顯示選中的 tab，並設定為 active
    document.getElementById(tabName).classList.add("active");
    document.querySelector(`.tab-links[onclick="openTab('${tabName}')"]`).classList.add("active");
}

// 調整 margin 以確保標籤正確對齊
function adjustMargin() {
    var tabsHeight = document.querySelector('.tabs-wrapper').offsetHeight;
    document.querySelector('p').style.marginTop = tabsHeight + 'px';
}

// 初次加載時執行
adjustMargin();

// 如果窗口大小改變，重新計算高度
window.onresize = function() {
    adjustMargin();
};

document.addEventListener('DOMContentLoaded', () => {
    // 選取所有的 label 元素
    const labels = document.querySelectorAll('label');

    labels.forEach(label => {
        // 當滑鼠移到 label 上時改變顏色
        label.addEventListener('mouseover', () => {
            label.style.color = 'black';
            label.style.fontWeight = 'bold'; // 可選：文字加粗
        });

        // 當滑鼠移開時恢復原來樣式
        label.addEventListener('mouseout', () => {
            label.style.color = ''; // 恢復默認顏色
            label.style.fontWeight = ''; // 恢復默認粗細
        });
    });
});

// 滾動到頂部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 滾動到底部
function scrollToBottom() {
    window.scrollTo({
        top: document.body.scrollHeight,
        behavior: 'smooth'
    });
}

// 切換固定欄位標題
function toggleFixTop() {
    var headerContainer = document.getElementById('header-container');
    var checkbox = document.getElementById('toggle-fix-top');
    if (checkbox.checked) {
        headerContainer.classList.add('fixed-top');
    } else {
        headerContainer.classList.remove('fixed-top');
    }
}

// 初始化固定欄位標題
function initFixTop() {
    var headerContainer = document.getElementById('header-container');
    var checkbox = document.getElementById('toggle-fix-top');
    
    if (headerContainer && checkbox && checkbox.checked) {
        headerContainer.classList.add('fixed-top');
    }
}

// 確保初始化在頁面加載後執行
window.addEventListener('DOMContentLoaded', initFixTop);

// 切換固定頁面寬度
function toggleWidth() {
    var itemsTab = document.getElementById("items");
    if (document.getElementById("toggle-width").checked) {
        itemsTab.classList.add("fixed-width");
    } else {
        itemsTab.classList.remove("fixed-width");
    }
}

// 自定義平滑捲動函數
function smoothScrollBy(deltaX, deltaY, duration = 200) {
    const startX = window.scrollX;
    const startY = window.scrollY;
    const startTime = performance.now();

    function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1); // 計算進度（0 到 1）
        const easeInOut = progress < 0.5
            ? 2 * progress * progress
            : -1 + (4 - 2 * progress) * progress; // 緩入緩出效果
        const scrollX = easeInOut * deltaX;
        const scrollY = easeInOut * deltaY;

        window.scrollTo(startX + scrollX, startY + scrollY);

        if (elapsed < duration) {
            requestAnimationFrame(step);
        }
    }

    requestAnimationFrame(step);
}

// 處理 Alt+ArrowLeft、Alt+ArrowRight、PageUp 和 PageDown 的捲動
function handlePageScroll(event) {
    const scrollHorizontalAmount = window.innerWidth * 0.85; // 水平捲動距離
    const scrollVerticalAmount = window.innerHeight * 0.75; // 垂直捲動距離
    const duration = 150; // 設定更快的捲動速度（時間以毫秒為單位）

    if (event.altKey && event.key === 'ArrowLeft') {
        // Alt+ArrowLeft 向左捲動
        smoothScrollBy(-scrollHorizontalAmount, 0, duration);
        event.preventDefault(); // 防止預設行為
    } else if (event.altKey && event.key === 'ArrowRight') {
        // Alt+ArrowRight 向右捲動
        smoothScrollBy(scrollHorizontalAmount, 0, duration);
        event.preventDefault(); // 防止預設行為
    } else if (!event.altKey && event.key === 'PageUp') {
        // PageUp 向上捲動
        smoothScrollBy(0, -scrollVerticalAmount, duration);
        event.preventDefault(); // 防止預設行為
    } else if (!event.altKey && event.key === 'PageDown') {
        // PageDown 向下捲動
        smoothScrollBy(0, scrollVerticalAmount, duration);
        event.preventDefault(); // 防止預設行為
    }
}

// 全域監聽鍵盤事件
document.addEventListener('keydown', handlePageScroll);

// 限制 Alt+左箭頭、Alt+右箭頭 和 Alt+Home 的功能
function restrictAltKeyCombos(event) {
    if (
        event.altKey && 
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home')
    ) {
        event.preventDefault(); // 阻止預設行為
    }
}

// 監聽鍵盤按下事件
document.addEventListener('keydown', restrictAltKeyCombos);

document.addEventListener("scroll", function () {
    let scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    let maxScroll = document.documentElement.scrollWidth - window.innerWidth; // 最大可滾動範圍
    let viewportWidth = window.innerWidth; // 可視範圍寬度
    let buttonWidth = document.querySelector(".add-buttons").offsetWidth; // 取得按鍵區塊寬度

    if (buttonWidth <= viewportWidth) {
        // 如果按鍵區塊可完全容納在視窗內，保持靠左
        document.querySelector(".add-buttons").style.left = "0px";
    } else {
        // 如果按鍵區塊超出可視範圍，按比例移動
        let maxLeft = viewportWidth - buttonWidth; // 最大可移動範圍
        let moveRatio = scrollLeft / maxScroll; // 計算滾動比例
        let newLeft = moveRatio * maxLeft; // 按比例計算 `left` 值

        document.querySelector(".add-buttons").style.left = `${newLeft}px`;
    }
});

// 獲取文字區塊與彈跳框元素
const shortcutHelpBlock = document.getElementById('shortcut-help-block');
const shortcutHelpModal = document.getElementById('shortcut-help-modal');

// 滑鼠移入時顯示快捷鍵說明
shortcutHelpBlock.addEventListener('mouseenter', () => {
    shortcutHelpModal.style.display = 'block';
});

// 滑鼠移出時隱藏快捷鍵說明
shortcutHelpBlock.addEventListener('mouseleave', () => {
    shortcutHelpModal.style.display = 'none';
});

// 切換所有項次編號的反色
document.addEventListener('DOMContentLoaded', function() {
    // 切換所有項次編號的反色
    const header = document.querySelector('.item-no-header');
    header.addEventListener('click', toggleAllItems);

    function toggleAllItems() {
        const itemNos = document.querySelectorAll('.item-no');
        const isAnySelected = Array.from(itemNos).some(item => item.classList.contains('selected'));

        if (isAnySelected) {
            // 如果有任何項次被選中，則取消所有選中狀態
            itemNos.forEach(item => item.classList.remove('selected'));
        } else {
            // 如果沒有任何項次被選中，則選中所有項次
            itemNos.forEach(item => item.classList.add('selected'));
        }
    }
});

// 切換選中狀態-項次左側編號
function toggleSelect(element) {
    element.classList.toggle('selected');
}

// 運單號過濾，僅允許 'SF' 和數字
function filterSFAndNumbers(input) {
    const originalValue = input.value;
    input.value = input.value.replace(/[^SF0-9]/gi, '');

    if (/[^\dSF]/gi.test(originalValue)) {
        showHint(input, '僅允許輸入 SF 和半形數字');
    }
}

// 僅允許數字 0-9
function filterNumbers(input) {
    const originalValue = input.value;
    input.value = input.value.replace(/[^0-9]/g, '');

    if (/[^0-9]/.test(originalValue)) {
        showHint(input, '僅允許輸入半形數字');
    }
}

// 僅允許英文 A-Z
function filterAlphabets(input) {
    const originalValue = input.value;
    input.value = input.value.replace(/[^A-Z]/gi, '');

    if (/[^A-Za-z]/.test(originalValue)) {
        showHint(input, '僅允許輸入半形英文');
    }
}

// 僅允許數字 0-9 和英文 A-Z
function filterAlphanumeric(input) {
    const originalValue = input.value;
    input.value = input.value.replace(/[^0-9A-Z]/gi, '');

    if (/[^0-9A-Za-z]/.test(originalValue)) {
        showHint(input, '僅允許輸入半形數字和英文');
    }
}

// 提示函式
function showHint(input, message) {
    const hint = document.createElement('div');
    hint.className = 'input-hint';
    hint.textContent = message;

    if (!input.nextElementSibling || input.nextElementSibling.className !== 'input-hint') {
        input.insertAdjacentElement('afterend', hint);

        setTimeout(() => {
            if (hint.parentNode) {
                hint.parentNode.removeChild(hint);
            }
        }, 2000);
    }
}

// 調整項次順序
function dragElement(element, header) {
    var pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    if (header) {
        header.onmousedown = dragMouseDown;
    } else {
        element.onmousedown = dragMouseDown;
    }

    function dragMouseDown(e) {
        e = e || window.event;
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function elementDrag(e) {
        e = e || window.event;
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
    }
}

// 初始化拖動功能
dragElement(document.getElementById("item-modal"), document.getElementById("item-modal-header"));
dragElement(document.getElementById("adjust-order-modal"), document.getElementById("adjust-order-modal-header"));
dragElement(document.getElementById("specify-field-modal"), document.getElementById("specify-field-modal-header"));

// 標記及貨櫃號碼及其它申報事項展開/收合
function toggleRows(textareaId, button) {
    const textarea = document.getElementById(textareaId);
    const currentRows = textarea.rows;

    if (currentRows === 5) {
        textarea.rows = 10;
        button.textContent = "展開";
    } else if (currentRows === 10) {
        textarea.rows = 15;
        button.textContent = "收合";
    } else {
        textarea.rows = 5;
        button.textContent = "展開";
    }
}

// 設置行數選項
let currentRowSetting = 0; // 用來追蹤當前行數狀態
const rowOptions = [1, 5, 10]; // 定義三種行數選項

function toggleAllTextareas() {
    // 更新行數設定，循環切換至下一個行數
    currentRowSetting = (currentRowSetting + 1) % rowOptions.length;
    const newRows = rowOptions[currentRowSetting];

    // 設置所有文本域的行數
    document.querySelectorAll('.declaration-item textarea').forEach(textarea => {
        textarea.rows = newRows;
    });

    // 更新按鈕文本根據行數
    const buttonText = newRows === 1 ? '展開全部品名' : (newRows === 5 ? '展開全部至 10 行' : '收合全部至 1 行');
    document.getElementById('toggle-all-btn').textContent = buttonText;
}

// 處理 Alt+w 鍵的函數
function handleAltWKey(event) {
    if (event.altKey && (event.key === 'w' || event.key === 'W')) {
        toggleAllTextareas();
    }
}

// 全域監聽 Alt+w 鍵，表示切換所有文本域顯示和隱藏
document.addEventListener('keydown', handleAltWKey);

// 處理所有輸入框的鍵盤事件
function handleInputKeyDown(event, inputElement) {
    if (event.key === 'Enter' && inputElement.classList.contains('CCC_CODE')) {
        handleCCCCodeEnter(event, inputElement);
    }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        handleArrowKeyNavigation(event);
    }
}

// 函數禁止方向鍵調整數字並實現上下導航
function handleArrowKeyNavigation(event) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        event.preventDefault();
        const currentInput = event.target;
        const allInputs = Array.from(document.querySelectorAll(`.${currentInput.className.split(' ')[0]}`));
        const currentIndex = allInputs.indexOf(currentInput);

        if (event.key === 'ArrowUp' && currentIndex > 0) {
            allInputs[currentIndex - 1].focus();
        } else if (event.key === 'ArrowDown' && currentIndex < allInputs.length - 1) {
            allInputs[currentIndex + 1].focus();
        }
    }
}

// 函數實現文本域上下導航
function handleTextareaArrowKeyNavigation(event) {
    const currentTextarea = event.target;
    const start = currentTextarea.selectionStart;
    const value = currentTextarea.value;
    
    // 獲取光標位置的行號
    const lines = value.substr(0, start).split("\n");
    const currentLine = lines.length;
    const totalLines = value.split("\n").length;
    
    if (event.altKey) {
        // 當按住 Alt 鍵時，實現文本域上下導航
        if (event.key === 'ArrowUp') {
            event.preventDefault();
            navigateTextarea(currentTextarea, -1);
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            navigateTextarea(currentTextarea, 1);
        }
    } else {
        // 當未按住 Alt 鍵時，檢查光標位置以決定是否進行導航
        if (event.key === 'ArrowUp' && currentLine === 1) {
            event.preventDefault();
            navigateTextarea(currentTextarea, -1);
        } else if (event.key === 'ArrowDown' && currentLine === totalLines) {
            event.preventDefault();
            navigateTextarea(currentTextarea, 1);
        }
    }
}

function navigateTextarea(currentTextarea, direction) {
    const allTextareas = Array.from(document.querySelectorAll(`.${currentTextarea.className.split(' ')[0]}`));
    const currentIndex = allTextareas.indexOf(currentTextarea);

    if (direction === -1 && currentIndex > 0) {
        allTextareas[currentIndex - 1].focus();
    } else if (direction === 1 && currentIndex < allTextareas.length - 1) {
        allTextareas[currentIndex + 1].focus();
    }
}

function highlightRow(element) {
    const row = element.closest('.item-row');
    if (row) {
        row.classList.add('highlight-row');
    }
}

function removeHighlight(element) {
    const row = element.closest('.item-row');
    if (row) {
        row.classList.remove('highlight-row');
    }
}