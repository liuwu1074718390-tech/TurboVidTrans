# TurboVidTrans

TurboVidTrans 是一个高效的媒体与视频处理工具集，包含**自动化视频特效合成引擎**以及**针对特定播放器防回滚机制的视频倍速增强扩展**。

---

## 目录结构

```text
TurboVidTrans/
├── video_composer.py            # 自动化高清科技感宣传片与视频合成引擎 (Python + FFmpeg)
├── package.json                 # Node.js 环境依赖配置 (@ffmpeg-installer/ffmpeg)
├── gdiecc-speed-controller/     # Chrome 浏览器扩展：网课视频极速控制器 (最高 16x 防失效)
│   ├── manifest.json            # 扩展配置清单 (MV3)
│   ├── inject.js                # 页面上下文注入脚本 (原型链欺骗与倍速锁定)
│   ├── content.js               # 内容脚本 (跨 iframe 注入与快捷键监听)
│   └── README.md                # 插件专用详细使用说明
└── .gitignore                   # 敏感凭据、输出产物与临时文件忽略规则
```

---

## 核心模块详解

### 1. 自动化视频合成引擎 (`video_composer.py`)

基于 **Python + FFmpeg + PIL** 构建的视频流水线处理工具，专用于将录屏片段自动化合成为具有科技感的专业宣传/演示视频：

- **镜头调度与切片**：支持多镜头配置，精确指定入点时间 (`ss`) 与持续时长 (`dur`)。
- **HUD 科技感蒙版生成**：利用 PIL 自动生成半透明科技渐变遮罩、标题标签、装饰边框与副标题文本。
- **动态运镜与转场**：支持动态缓动缩放 (`zoom_in`) 与镜头间平滑 Crossfade 混合过渡。
- **自动化压制导出**：调用 FFmpeg 统一规范分辨率、采样率及音视频编解码，一键渲染成片。

#### 依赖环境
- Python 3.8+
- PIL / Pillow (`pip install Pillow`)
- FFmpeg（或通过 `npm install` 引入 `@ffmpeg-installer/ffmpeg`）

#### 使用示例
```bash
# 安装依赖
npm install

# 运行合成引擎
python3 video_composer.py
```

---

### 2. 网课极速控制器扩展 (`gdiecc-speed-controller`)

专为网课平台（如 `*.21tb.com` 等）定制的 Chrome 扩展，突破常规倍速插件超过 2 倍速时被平台播放器强制重置为 1.0 的限制，最高支持 **16 倍速极速播放**。

#### 核心防失效机制
1. **原型链状态伪装 (State Spoofing)**：拦截页面脚本读取 `video.playbackRate`，伪装返回 1.0/2.0，绕过播放器内部防作弊检查。
2. **防回滚强制锁定 (Rollback Defense)**：拦截播放器的降速 setter 操作，保持真实物理倍速锁定。
3. **事件静默阻断**：在捕获阶段拦截 `ratechange` 事件，阻止触发网页回调。
4. **防切屏与后台播放**：拦截 `visibilityState` 页面失焦与隐藏状态，切换标签页或最小化窗口不中断播放。
5. **多层 Iframe 深度穿透**：自动注入多层嵌套的网课播放器容器。

#### 快捷键操作

| 按键 | 功能说明 |
| :---: | :--- |
| `[` | 播放速度 **-0.5x**（最低 0.1x） |
| `]` | 播放速度 **+0.5x**（最高 16.0x） |
| `\` | 恢复正常速度 **1.0x** |
| `=` / `+` | 一键提速至 **16.0x 极限速度** |

#### 安装方法
1. 在 Chrome 浏览器打开 `chrome://extensions/`；
2. 开启右上角 **“开发者模式”**；
3. 点击 **“加载已解压的扩展程序”**，选择项目中的 `gdiecc-speed-controller` 目录即可。
4. 详见 [gdiecc-speed-controller/README.md](gdiecc-speed-controller/README.md)。

---

## 授权与安全

- 本仓库已配置完善的 [.gitignore](.gitignore)，自动排除私钥证书 (`*.pem`)、本地构建产物及临时数据目录。
- 仅用于合法学习研究与自动化处理场景。
