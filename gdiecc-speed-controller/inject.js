/**
 * 21tb 视频极速控制器 - 核心底层注入脚本 (MAIN World)
 * 职责：
 * 1. 劫持 HTMLMediaElement.prototype.playbackRate 原型属性，实现“物理超速 + 逻辑欺骗”
 * 2. 拦截并阻止 ratechange 事件向网页代码广播，防止播放器触发超速回滚
 * 3. 守护定时器与动态 DOM 监听，确保切集、换源、重渲染后倍速依然锁定
 * 4. 可选拦截 visibilitychange 与 blur 事件，防止切换标签页时自动暂停
 */
(function () {
  'use strict';

  // 避免重复注入
  if (window.__21TB_SPEED_INJECTED__) return;
  window.__21TB_SPEED_INJECTED__ = true;

  // 1. 获取并保存浏览器原生描述符与方法
  const rawPlaybackRateDesc = Object.getOwnPropertyDescriptor(
    HTMLMediaElement.prototype,
    'playbackRate'
  );
  if (!rawPlaybackRateDesc || !rawPlaybackRateDesc.set || !rawPlaybackRateDesc.get) {
    console.warn('[21tb极速控制器] 无法获取原生的 playbackRate 属性描述符');
    return;
  }

  const rawPlay = HTMLMediaElement.prototype.play;
  const rawPause = HTMLMediaElement.prototype.pause;

  // 2. 核心状态管理
  const state = {
    targetRate: 1.0,          // 用户期望的真实物理播放倍速 (0.1 ~ 16.0)
    isLocked: true,           // 是否锁定倍速（开启后拦截网页的重置请求）
    fakeRate: 1.0,            // 欺骗网页播放器的虚假倍速（永远 <= 2.0，默认 1.0）
    preventBlurPause: true,   // 阻止窗口失焦自动暂停
    autoMuteAbove4x: false    // 超高倍速自动静音开关
  };

  // 3. 核心穿透方法：直接操作浏览器硬件层，设置底层真实倍速
  function applyPhysicalRate(mediaElement, rate) {
    try {
      const validRate = Math.min(Math.max(parseFloat(rate) || 1.0, 0.0625), 16.0);
      rawPlaybackRateDesc.set.call(mediaElement, validRate);

      // 处理高倍速静音辅助（超过4倍速若开启了自动静音）
      if (state.autoMuteAbove4x && validRate > 4.0) {
        if (!mediaElement.muted) {
          mediaElement.dataset.__cc_auto_muted = 'true';
          mediaElement.muted = true;
        }
      } else if (mediaElement.dataset.__cc_auto_muted === 'true') {
        mediaElement.muted = false;
        delete mediaElement.dataset.__cc_auto_muted;
      }
    } catch (err) {
      console.error('[21tb极速控制器] 设置物理倍速失败:', err);
    }
  }

  // 对当前页面（包括 shadow DOM/嵌套 iframe）的所有媒体元素应用目标速率
  function applyRateToAllMedia() {
    if (!state.isLocked) return;
    const mediaElements = document.querySelectorAll('video, audio');
    mediaElements.forEach((media) => {
      const currentRealRate = rawPlaybackRateDesc.get.call(media);
      if (Math.abs(currentRealRate - state.targetRate) > 0.01) {
        applyPhysicalRate(media, state.targetRate);
      }
    });
  }

  // 4. 重写 HTMLMediaElement.prototype.playbackRate
  Object.defineProperty(HTMLMediaElement.prototype, 'playbackRate', {
    get: function () {
      // 如果锁定了倍速且目标倍速大于 2.0，对网页脚本伪装返回 fakeRate (通常为 1.0 或 2.0)
      if (state.isLocked && state.targetRate > 2.0) {
        return state.fakeRate;
      }
      return rawPlaybackRateDesc.get.call(this);
    },
    set: function (newRate) {
      const parsedRate = parseFloat(newRate);

      // 如果当前开启了倍速锁定
      if (state.isLocked) {
        // 如果网页尝试将倍速降回 1.0 / 2.0，或者设为其他值：
        // 允许网页更新其“认知中”的速度（fakeRate），满足播放器 UI 状态机的更新
        state.fakeRate = parsedRate <= 2.0 ? parsedRate : 1.0;

        // 但底层绝对不屈服！若用户设定了特定倍速，保持物理真实倍速
        applyPhysicalRate(this, state.targetRate);
        return;
      }

      // 未锁定时，按原样设置
      state.targetRate = parsedRate;
      state.fakeRate = parsedRate;
      rawPlaybackRateDesc.set.call(this, parsedRate);
    },
    configurable: true,
    enumerable: true
  });

  // 5. 阻止 ratechange 事件向网页代码扩散（网页通过监听该事件回退速度）
  window.addEventListener(
    'ratechange',
    function (e) {
      // 当处于锁定状态且倍速大于 2 时，彻底截断该事件的传播
      if (state.isLocked && state.targetRate > 2.0) {
        e.stopImmediatePropagation();
        e.stopPropagation();
      }
    },
    true // 捕获阶段拦截，先于网页自身绑定的监听器执行
  );

  // 6. 劫持 play 方法：新视频起播时，立即同步倍速
  HTMLMediaElement.prototype.play = function () {
    if (state.isLocked) {
      applyPhysicalRate(this, state.targetRate);
    }
    return rawPlay.apply(this, arguments);
  };

  // 7. 防失焦暂停防御（许多网课切屏自动暂停）
  if (state.preventBlurPause) {
    // 欺骗 document.hidden 和 visibilityState
    try {
      Object.defineProperty(document, 'hidden', {
        get: () => false,
        configurable: true
      });
      Object.defineProperty(document, 'visibilityState', {
        get: () => 'visible',
        configurable: true
      });
    } catch (_) {}

    // 拦截 visibilitychange 和 blur 事件
    window.addEventListener(
      'visibilitychange',
      function (e) {
        if (state.preventBlurPause) {
          e.stopImmediatePropagation();
        }
      },
      true
    );

    window.addEventListener(
      'blur',
      function (e) {
        if (state.preventBlurPause && e.target === window) {
          e.stopImmediatePropagation();
        }
      },
      true
    );
  }

  // 8. 守护定时器：持续巡检所有音视频元素，防止播放器使用内部非标准属性或异步定时重置
  setInterval(() => {
    if (state.isLocked) {
      applyRateToAllMedia();
    }
  }, 400);

  // 9. MutationObserver：新插入 DOM 的 <video> 标签立即施加倍速控制
  const observer = new MutationObserver((mutations) => {
    if (!state.isLocked) return;
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (node.tagName === 'VIDEO' || node.tagName === 'AUDIO') {
            applyPhysicalRate(node, state.targetRate);
          } else {
            const mediaList = node.querySelectorAll && node.querySelectorAll('video, audio');
            if (mediaList && mediaList.length > 0) {
              mediaList.forEach((m) => applyPhysicalRate(m, state.targetRate));
            }
          }
        }
      }
    }
  });

  if (document.documentElement) {
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      observer.observe(document.documentElement, {
        childList: true,
        subtree: true
      });
    });
  }

  // 10. 跨上下文通信协议（接收来自 content.js / popup.js 的控制指令）
  window.addEventListener('message', function (event) {
    if (!event.data || event.data.source !== '21TB_SPEED_CONTENT') return;

    const { action, payload } = event.data;

    switch (action) {
      case 'SET_RATE': {
        const rate = parseFloat(payload.rate);
        if (!isNaN(rate) && rate > 0) {
          state.targetRate = rate;
          state.isLocked = payload.lock !== undefined ? Boolean(payload.lock) : state.isLocked;
          state.fakeRate = Math.min(state.targetRate, 2.0); // 伪装值不超 2.0
          applyRateToAllMedia();
          notifyStateChange();
        }
        break;
      }
      case 'TOGGLE_LOCK': {
        state.isLocked = Boolean(payload.lock);
        if (state.isLocked) {
          applyRateToAllMedia();
        }
        notifyStateChange();
        break;
      }
      case 'SET_CONFIG': {
        if (payload.preventBlurPause !== undefined) {
          state.preventBlurPause = Boolean(payload.preventBlurPause);
        }
        if (payload.autoMuteAbove4x !== undefined) {
          state.autoMuteAbove4x = Boolean(payload.autoMuteAbove4x);
        }
        notifyStateChange();
        break;
      }
      case 'GET_STATE': {
        notifyStateChange();
        break;
      }
    }
  });

  function notifyStateChange() {
    window.postMessage(
      {
        source: '21TB_SPEED_INJECT',
        action: 'STATE_CHANGED',
        payload: {
          targetRate: state.targetRate,
          isLocked: state.isLocked,
          fakeRate: state.fakeRate,
          preventBlurPause: state.preventBlurPause,
          autoMuteAbove4x: state.autoMuteAbove4x,
          mediaCount: document.querySelectorAll('video, audio').length
        }
      },
      '*'
    );
  }

  console.log('[21tb极速控制器] 底层注入模块已就绪，已就位防回滚与状态欺骗机制');
})();
