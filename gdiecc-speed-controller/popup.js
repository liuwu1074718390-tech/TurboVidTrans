/**
 * 21tb 视频极速控制器 - 弹窗逻辑 (Popup)
 */
document.addEventListener('DOMContentLoaded', () => {
  const rateValDisplay = document.getElementById('rate_val_display');
  const rateSlider = document.getElementById('rate_slider');
  const toggleLock = document.getElementById('toggle_lock');
  const togglePreventBlur = document.getElementById('toggle_prevent_blur');
  const toggleAutoMute = document.getElementById('toggle_auto_mute');
  const toggleShowFloating = document.getElementById('toggle_show_floating');
  const rateButtons = document.querySelectorAll('.rate-btn');

  let currentRate = 1.0;

  // 1. 初始化读取配置
  chrome.storage.local.get(
    ['savedRate', 'isLocked', 'preventBlurPause', 'autoMuteAbove4x', 'showFloatingPanel'],
    (res) => {
      if (res.savedRate) currentRate = parseFloat(res.savedRate);
      if (res.isLocked !== undefined) toggleLock.checked = Boolean(res.isLocked);
      if (res.preventBlurPause !== undefined) togglePreventBlur.checked = Boolean(res.preventBlurPause);
      if (res.autoMuteAbove4x !== undefined) toggleAutoMute.checked = Boolean(res.autoMuteAbove4x);
      toggleShowFloating.checked = Boolean(res.showFloatingPanel);

      updatePopupUI();
    }
  );

  function updatePopupUI() {
    rateValDisplay.textContent = currentRate.toFixed(1) + 'x';
    rateSlider.value = currentRate;

    rateButtons.forEach((btn) => {
      const rate = parseFloat(btn.dataset.rate);
      if (Math.abs(rate - currentRate) < 0.05) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  function applyRate(rate) {
    currentRate = Math.min(Math.max(parseFloat(rate) || 1.0, 0.1), 16.0);
    updatePopupUI();

    // 存储到 storage，触发当前页面所有 frame 的 content.js 同步生效
    chrome.storage.local.set({ savedRate: currentRate });
  }

  // 2. 绑定事件
  rateSlider.addEventListener('input', (e) => {
    applyRate(e.target.value);
  });

  rateButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      applyRate(btn.dataset.rate);
    });
  });

  toggleLock.addEventListener('change', () => {
    chrome.storage.local.set({ isLocked: toggleLock.checked });
  });

  togglePreventBlur.addEventListener('change', () => {
    chrome.storage.local.set({ preventBlurPause: togglePreventBlur.checked });
  });

  toggleAutoMute.addEventListener('change', () => {
    chrome.storage.local.set({ autoMuteAbove4x: toggleAutoMute.checked });
  });

  toggleShowFloating.addEventListener('change', () => {
    chrome.storage.local.set({ showFloatingPanel: toggleShowFloating.checked });
  });
});
