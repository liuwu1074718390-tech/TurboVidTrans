/**
 * 21tb 视频极速控制器 - 内容脚本 (ISOLATED World)
 * 职责：
 * 1. 负责向页面挂载悬浮调速胶囊 UI
 * 2. 桥接用户操作、快捷键与 inject.js (MAIN World)
 * 3. 持久化存储用户倍速偏好与窗口位置
 */
(function () {
  'use strict';

  // 避免同一 frame 重复注入
  if (window.__21TB_CONTENT_MOUNTED__) return;
  window.__21TB_CONTENT_MOUNTED__ = true;

  const isTopWindow = window.top === window.self;

  // 1. 本地状态管理
  let currentRate = 1.0;
  let isLocked = true;
  let isMinimized = false;
  let hasMedia = false;
  let isStorageLoaded = false;
  let showFloatingPanel = false;

  // 2. 从 storage 读取用户偏好设置
  if (chrome.storage && chrome.storage.local) {
    // 兜底超时：避免 storage 异常未回调导致 UI 迟迟无法渲染
    const storageTimeoutTimer = setTimeout(() => {
      if (!isStorageLoaded) {
        isStorageLoaded = true;
        checkVisibilityDecision();
      }
    }, 150);

    chrome.storage.local.get(['savedRate', 'isLocked', 'isMinimized', 'posTop', 'posRight', 'showFloatingPanel'], (res) => {
      clearTimeout(storageTimeoutTimer);
      isStorageLoaded = true;

      if (res.savedRate) currentRate = parseFloat(res.savedRate);
      if (res.isLocked !== undefined) isLocked = Boolean(res.isLocked);
      if (res.isMinimized !== undefined) isMinimized = Boolean(res.isMinimized);
      if (res.showFloatingPanel !== undefined) showFloatingPanel = Boolean(res.showFloatingPanel);

      // 通知底层注入脚本同步初始状态
      postToInject('SET_RATE', { rate: currentRate, lock: isLocked });

      // 如果有挂载的 UI，更新其位置和展示；若未挂载，则尝试挂载
      if (container) {
        if (res.posTop) container.style.top = res.posTop;
        if (res.posRight) container.style.right = res.posRight;
        updateUI();
        container.style.display = showFloatingPanel ? '' : 'none';
      } else {
        checkVisibilityDecision();
      }
    });

    // 监听 storage 变更，与 Popup 实时联动
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      if (changes.savedRate) {
        currentRate = parseFloat(changes.savedRate.newValue);
        postToInject('SET_RATE', { rate: currentRate, lock: isLocked });
      }
      if (changes.isLocked !== undefined) {
        isLocked = Boolean(changes.isLocked.newValue);
        postToInject('TOGGLE_LOCK', { lock: isLocked });
      }
      if (changes.preventBlurPause !== undefined || changes.autoMuteAbove4x !== undefined) {
        postToInject('SET_CONFIG', {
          preventBlurPause: changes.preventBlurPause ? changes.preventBlurPause.newValue : undefined,
          autoMuteAbove4x: changes.autoMuteAbove4x ? changes.autoMuteAbove4x.newValue : undefined
        });
      }
      if (changes.isMinimized !== undefined) {
        isMinimized = Boolean(changes.isMinimized.newValue);
      }
      if (changes.showFloatingPanel !== undefined) {
        showFloatingPanel = Boolean(changes.showFloatingPanel.newValue);
        if (showFloatingPanel) {
          checkVisibilityDecision();
          if (container) container.style.display = '';
        } else {
          if (container) container.style.display = 'none';
        }
      }
      updateUI();
    });
  } else {
    isStorageLoaded = true;
  }

  // 3. 通信：发送指令给 MAIN World 中的 inject.js
  function postToInject(action, payload = {}) {
    window.postMessage(
      {
        source: '21TB_SPEED_CONTENT',
        action: action,
        payload: payload
      },
      '*'
    );
  }

  // 监听来自 inject.js 的状态变更广播
  window.addEventListener('message', (event) => {
    if (!event.data || event.data.source !== '21TB_SPEED_INJECT') return;
    if (event.data.action === 'STATE_CHANGED') {
      const data = event.data.payload;
      currentRate = data.targetRate;
      isLocked = data.isLocked;
      hasMedia = data.mediaCount > 0;
      updateUI();
      checkVisibilityDecision();
    }
  });

  // 4. UI 容器与节点
  let container = null;
  let rateDisplay = null;
  let miniDisplay = null;
  let customInput = null;
  let lockChip = null;

  function createControllerUI() {
    if (document.getElementById('__21tb_speed_controller_container__')) return;

    container = document.createElement('div');
    container.id = '__21tb_speed_controller_container__';
    if (isMinimized) container.classList.add('minimized');
    if (!showFloatingPanel) container.style.display = 'none';

    const rates = [1.0, 1.5, 2.0, 3.0, 5.0, 8.0, 12.0, 16.0];

    container.innerHTML = `
      <!-- 展开面板 -->
      <div class="__21tb_speed_panel">
        <div class="__21tb_header" id="__21tb_drag_handle">
          <div class="__21tb_title">
            <svg viewBox="0 0 24 24"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
            21tb 极速控制器
          </div>
          <div class="__21tb_actions">
            <button class="__21tb_icon_btn" id="__21tb_min_btn" title="最小化折叠">━</button>
          </div>
        </div>

        <div class="__21tb_speed_badge_row">
          <div class="__21tb_current_rate_text" id="__21tb_rate_text">1.0x</div>
          <div class="__21tb_status_chip" id="__21tb_lock_chip" title="点击切换是否强制锁定倍速（防止播放器回滚）">已防回滚锁定</div>
        </div>

        <div class="__21tb_btn_grid">
          ${rates.map((r) => `<button class="__21tb_rate_btn" data-rate="${r}">${r}x</button>`).join('')}
        </div>

        <div class="__21tb_custom_row">
          <button class="__21tb_step_btn" id="__21tb_btn_minus" title="减少 0.5x">-</button>
          <input type="number" class="__21tb_custom_input" id="__21tb_custom_input" min="0.1" max="16.0" step="0.5" value="1.0" />
          <button class="__21tb_step_btn" id="__21tb_btn_plus" title="增加 0.5x">+</button>
        </div>

        <div class="__21tb_tips">
          <div>快捷键: [ 减速 | ] 加速 | \\ 恢复1x | = 16x极速</div>
          <div>底层已启用防作弊伪装与防失焦暂停保护</div>
        </div>
      </div>

      <!-- 折叠态胶囊徽标 -->
      <div class="__21tb_mini_badge" id="__21tb_mini_btn" title="点击展开调速面板">
        ⚡ <span id="__21tb_mini_text">1.0x</span>
      </div>
    `;

    document.body.appendChild(container);

    // 绑定内部 DOM 引用
    rateDisplay = container.querySelector('#__21tb_rate_text');
    miniDisplay = container.querySelector('#__21tb_mini_text');
    customInput = container.querySelector('#__21tb_custom_input');
    lockChip = container.querySelector('#__21tb_lock_chip');

    // 事件绑定
    // 快捷倍速按钮
    container.querySelectorAll('.__21tb_rate_btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const rate = parseFloat(btn.dataset.rate);
        setSpeed(rate);
      });
    });

    // 步进按钮
    container.querySelector('#__21tb_btn_minus').addEventListener('click', () => {
      setSpeed(Math.max(0.1, Number((currentRate - 0.5).toFixed(1))));
    });
    container.querySelector('#__21tb_btn_plus').addEventListener('click', () => {
      setSpeed(Math.min(16.0, Number((currentRate + 0.5).toFixed(1))));
    });

    // 自定义输入框
    customInput.addEventListener('change', () => {
      let val = parseFloat(customInput.value);
      if (isNaN(val)) val = 1.0;
      val = Math.min(Math.max(val, 0.1), 16.0);
      setSpeed(val);
    });

    // 锁定状态切换
    lockChip.addEventListener('click', () => {
      isLocked = !isLocked;
      postToInject('TOGGLE_LOCK', { lock: isLocked });
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ isLocked: isLocked });
      }
      updateUI();
    });

    // 最小化 / 展开
    container.querySelector('#__21tb_min_btn').addEventListener('click', toggleMinimize);
    container.querySelector('#__21tb_mini_btn').addEventListener('click', toggleMinimize);

    // 拖拽支持
    initDraggable(container, container.querySelector('#__21tb_drag_handle'));

    updateUI();
  }

  function setSpeed(rate) {
    currentRate = rate;
    postToInject('SET_RATE', { rate: currentRate, lock: isLocked });
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ savedRate: currentRate });
    }
    updateUI();
  }

  function toggleMinimize() {
    isMinimized = !isMinimized;
    if (chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ isMinimized: isMinimized });
    }
    updateUI();
  }

  function updateUI() {
    if (!container) return;
    container.classList.toggle('minimized', isMinimized);
    const formatted = currentRate.toFixed(1) + 'x';
    if (rateDisplay) rateDisplay.textContent = formatted;
    if (miniDisplay) miniDisplay.textContent = formatted;
    if (customInput && document.activeElement !== customInput) {
      customInput.value = currentRate.toFixed(1);
    }

    if (lockChip) {
      if (isLocked) {
        lockChip.textContent = '已防回滚锁定';
        lockChip.classList.remove('unlocked');
      } else {
        lockChip.textContent = '未锁定(易回退)';
        lockChip.classList.add('unlocked');
      }
    }

    // 更新按钮高亮
    container.querySelectorAll('.__21tb_rate_btn').forEach((btn) => {
      const btnRate = parseFloat(btn.dataset.rate);
      if (Math.abs(btnRate - currentRate) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  // 拖动逻辑
  function initDraggable(targetEl, handleEl) {
    let isDragging = false;
    let startX = 0,
      startY = 0;
    let startRight = 20,
      startTop = 60;

    handleEl.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // 仅左键
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;

      const rect = targetEl.getBoundingClientRect();
      startTop = rect.top;
      startRight = window.innerWidth - rect.right;

      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
      e.preventDefault();
    });

    function onMouseMove(e) {
      if (!isDragging) return;
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;

      const newTop = Math.max(10, Math.min(window.innerHeight - 80, startTop + deltaY));
      const newRight = Math.max(10, Math.min(window.innerWidth - 80, startRight - deltaX));

      targetEl.style.top = `${newTop}px`;
      targetEl.style.right = `${newRight}px`;
    }

    function onMouseUp() {
      if (!isDragging) return;
      isDragging = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      // 持久化位置
      if (chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({
          posTop: targetEl.style.top,
          posRight: targetEl.style.right
        });
      }
    }
  }

  // 5. 键盘快捷键监听
  window.addEventListener('keydown', (e) => {
    // 若在输入框中打字，不触发快捷键
    const activeEl = document.activeElement;
    if (
      activeEl &&
      (activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.isContentEditable)
    ) {
      return;
    }

    if (e.key === '[') {
      // 减速
      setSpeed(Math.max(0.1, Number((currentRate - 0.5).toFixed(1))));
      e.preventDefault();
    } else if (e.key === ']') {
      // 加速
      setSpeed(Math.min(16.0, Number((currentRate + 0.5).toFixed(1))));
      e.preventDefault();
    } else if (e.key === '\\') {
      // 恢复 1.0x
      setSpeed(1.0);
      e.preventDefault();
    } else if (e.key === '=' || e.key === '+') {
      // 一键 16.0x 极速
      setSpeed(16.0);
      e.preventDefault();
    }
  });

  // 6. UI 挂载决策逻辑：
  // 如果当前是包含 video 的 frame，或者当前是 top window 并且有可能是主播放页面，则挂载 UI
  function checkVisibilityDecision() {
    // 若配置尚未加载完毕，等待配置就绪后再挂载
    if (!isStorageLoaded) return;

    if (!showFloatingPanel) {
      if (container) container.style.display = 'none';
      return;
    }

    const hasLocalMedia = document.querySelectorAll('video, audio').length > 0;
    // 满足条件之一即显示：
    // 1. 本 frame 内直接存在音视频元素
    // 2. 顶级主窗口 (window.top === window.self)
    if (hasLocalMedia || isTopWindow) {
      if (!container && document.body) {
        createControllerUI();
      } else if (container) {
        container.style.display = '';
      }
    }
  }

  // 初始化检查
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', checkVisibilityDecision);
  } else {
    checkVisibilityDecision();
  }

  // 周期性探测是否有异步加载的 video
  const mediaDetectTimer = setInterval(() => {
    postToInject('GET_STATE');
    checkVisibilityDecision();
  }, 1000);

  // 5秒后降低探测频率
  setTimeout(() => {
    clearInterval(mediaDetectTimer);
    setInterval(() => {
      postToInject('GET_STATE');
    }, 3000);
  }, 6000);
})();
