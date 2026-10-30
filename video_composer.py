#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
广咨造价数据平台 3分钟高清科技感宣传片合成引擎
"""
import os
import sys
import subprocess
import time
from PIL import Image, ImageDraw, ImageFont

FFMPEG = "/Users/liuwu/Desktop/主平台SaaS测试环境/tools/node_modules/@ffmpeg-installer/darwin-arm64/ffmpeg"
FONT_PATH = "/System/Library/Fonts/STHeiti Medium.ttc"
INPUT_DIR = "/Users/liuwu/Desktop/录屏"
OUTPUT_DIR = "/Users/liuwu/Desktop/主平台SaaS测试环境/tools/output"
FINAL_VIDEO = "/Users/liuwu/Desktop/广咨造价数据平台_3分钟宣传视频.mp4"

os.makedirs(OUTPUT_DIR, exist_ok=True)
HUD_DIR = os.path.join(OUTPUT_DIR, "hud")
CLIPS_DIR = os.path.join(OUTPUT_DIR, "clips")
os.makedirs(HUD_DIR, exist_ok=True)
os.makedirs(CLIPS_DIR, exist_ok=True)

# 镜头清单配置 (共12个场景，严格贴合宣传片叙事脉络与旁白体系)
SCENES = [
    {
        "id": "scene_01_intro_city",
        "file": os.path.join(INPUT_DIR, "序章.mp4"),
        "ss": 0.5,
        "dur": 8.5,
        "mode": "zoom_in",
        "tag": "OVERVIEW · 数智破局",
        "title": "广咨国际造价数据平台",
        "desc": "智能投资管控 · 铸就可信贯通的数字底座"
    },
    {
        "id": "scene_02_intro_dashboard",
        "file": os.path.join(INPUT_DIR, "指标概况.mp4"),
        "ss": 0.0,
        "dur": 7.5,
        "mode": "zoom_in",
        "tag": "DASHBOARD · 全景看板",
        "title": "融合量价智慧 · 综合决策大脑",
        "desc": "掌控造价趋势与费用构成 · 实现数据资产动态可视化"
    },
    {
        "id": "scene_03_ingest_parse",
        "file": os.path.join(INPUT_DIR, "指标入库.mp4"),
        "ss": 5.0,
        "dur": 20.0,
        "mode": "zoom_in",
        "tag": "SECTION 01 · 智能解析",
        "title": "多源计价文件 · 一键解析归集",
        "desc": "自动提取项目结构与计算口径 · 沉淀多维标准指标"
    },
    {
        "id": "scene_04_ingest_metrics",
        "file": os.path.join(INPUT_DIR, "指标入库.mp4"),
        "ss": 45.0,
        "dur": 25.0,
        "mode": "zoom_in",
        "tag": "SECTION 02 · 指标沉淀",
        "title": "多层指标体系 · 灵活度量复用",
        "desc": "项目/单位/分部分项/工料机 · 多维度对标与参考区间"
    },
    {
        "id": "scene_05_qc_rules",
        "file": os.path.join(INPUT_DIR, "质控中心.mp4"),
        "ss": 2.0,
        "dur": 23.0,
        "mode": "zoom_in",
        "tag": "SECTION 03 · 智能质控",
        "title": "规则引擎内嵌 · 智能全维体检",
        "desc": "自动扫描清单定额量价漏洞 · 红色精准预警与问题定位"
    },
    {
        "id": "scene_06_qc_trace",
        "file": os.path.join(INPUT_DIR, "质控中心.mp4"),
        "ss": 27.0,
        "dur": 15.0,
        "mode": "zoom_in",
        "tag": "SECTION 04 · 过程留痕",
        "title": "动态单价联动 · 筑牢质量防线",
        "desc": "联动行业指标精准捕捉异常 · 全程批注留痕可追溯"
    },
    {
        "id": "scene_07_compare_projects",
        "file": os.path.join(INPUT_DIR, "文件对比.mp4"),
        "ss": 7.0,
        "dur": 25.0,
        "mode": "zoom_in",
        "tag": "SECTION 05 · 深度对标",
        "title": "跨阶段纵向复核 · 跨项目横向对标",
        "desc": "科目清单定额多工程同台深度比对 · 毫厘偏差无处遁形"
    },
    {
        "id": "scene_08_material_impact",
        "file": os.path.join(INPUT_DIR, "材价中心.mp4"),
        "ss": 11.0,
        "dur": 17.0,
        "mode": "zoom_in",
        "tag": "SECTION 06 · 材价透视",
        "title": "采购波动测算 · 偏差冲击值建模",
        "desc": "核心公式剖析成本空间 · 将专业能力前置风险防控"
    },
    {
        "id": "scene_09_est_standards",
        "file": os.path.join(INPUT_DIR, "投资估算.mp4"),
        "ss": 1.0,
        "dur": 14.0,
        "mode": "zoom_in",
        "tag": "SECTION 07 · 源头决策",
        "title": "正反智能估算 · 辅助源头决策",
        "desc": "建造标准多维点选 · 匹配相似案例推演投资规模"
    },
    {
        "id": "scene_10_est_calculate",
        "file": os.path.join(INPUT_DIR, "投资估算.mp4"),
        "ss": 16.0,
        "dur": 15.0,
        "mode": "zoom_in",
        "tag": "SECTION 08 · 投资推演",
        "title": "秒级测算费用 · 从被动走向主动",
        "desc": "建安费用清单推演 · 事前主动管控锁定最优造价目标"
    },
    {
        "id": "scene_11_ai_assistant",
        "file": os.path.join(INPUT_DIR, "AI相关.mp4"),
        "ss": 0.0,
        "dur": 15.5,
        "mode": "zoom_in",
        "tag": "SECTION 09 · AI 智赋",
        "title": "造价小咨助手 · 智能方案推演",
        "desc": "对话式限额推演 · 自动核对项目画像与比选建议"
    },
    {
        "id": "scene_12_outro_brand",
        "file": None, # 特殊处理：看板拉远 + 品牌落版
        "ss": 0.0,
        "dur": 10.0,
        "mode": "outro",
        "tag": "CONCLUSION · 数智远见",
        "title": "以历史为鉴 · 以数据为尺",
        "desc": "打通全过程造价管理链路 · 赋能工程投资综合决策"
    }
]

def generate_hud_png(tag_text, title_text, desc_text, out_path):
    """
    生成高质感科技感半透明毛玻璃 HUD 章节角标卡片
    """
    img = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    x0, y0 = 60, 50
    w, h = 640, 96
    x1, y1 = x0 + w, y0 + h

    overlay = Image.new("RGBA", (1920, 1080), (0, 0, 0, 0))
    d_overlay = ImageDraw.Draw(overlay)
    
    # 毛玻璃背景与发光边框
    d_overlay.rounded_rectangle([x0, y0, x1, y1], radius=10, fill=(11, 20, 38, 215), outline=(56, 189, 248, 140), width=1)
    d_overlay.line([x0 + 15, y0 + 1, x0 + 200, y0 + 1], fill=(56, 189, 248, 240), width=2)
    d_overlay.rectangle([x0 + 1, y0 + 18, x0 + 5, y0 + 54], fill=(14, 165, 233, 240))

    img = Image.alpha_composite(img, overlay)
    draw = ImageDraw.Draw(img)

    font_tag = ImageFont.truetype(FONT_PATH, 13)
    font_title = ImageFont.truetype(FONT_PATH, 24)
    font_desc = ImageFont.truetype(FONT_PATH, 15)

    # 科技发光微点
    draw.ellipse([x0 + 20, y0 + 20, x0 + 28, y0 + 28], fill=(56, 189, 248, 255))
    draw.text((x0 + 35, y0 + 17), tag_text.upper(), font=font_tag, fill=(56, 189, 248, 240))
    draw.text((x0 + 20, y0 + 37), title_text, font=font_title, fill=(255, 255, 255, 250))
    draw.text((x0 + 20, y0 + 68), desc_text, font=font_desc, fill=(148, 163, 184, 220))

    img.save(out_path, "PNG")

def generate_brand_card_png(out_path):
    """
    生成终章品牌落版卡片
    """
    img = Image.new("RGBA", (1920, 1080), (8, 15, 30, 255))
    draw = ImageDraw.Draw(img)

    font_title = ImageFont.truetype(FONT_PATH, 48)
    font_sub = ImageFont.truetype(FONT_PATH, 22)
    font_tag = ImageFont.truetype(FONT_PATH, 16)

    cx, cy = 960, 540
    bw, bh = 840, 330
    draw.rounded_rectangle([cx - bw//2, cy - bh//2, cx + bw//2, cy + bh//2], radius=16, fill=(15, 23, 42, 230), outline=(56, 189, 248, 160), width=1)
    draw.line([cx - 200, cy - bh//2, cx + 200, cy - bh//2], fill=(56, 189, 248, 240), width=3)

    t1 = "广咨国际造价数据平台"
    bbox1 = draw.textbbox((0, 0), t1, font=font_title)
    w1 = bbox1[2] - bbox1[0]
    draw.text((cx - w1//2, cy - 82), t1, font=font_title, fill=(255, 255, 255, 255))

    t2 = "以历史为鉴  以数据为尺  铸就全过程造价数智底座"
    bbox2 = draw.textbbox((0, 0), t2, font=font_sub)
    w2 = bbox2[2] - bbox2[0]
    draw.text((cx - w2//2, cy + 3), t2, font=font_sub, fill=(56, 189, 248, 255))

    t3 = "决策有据 · 过程可控 · 追溯有凭 · 优化有策"
    bbox3 = draw.textbbox((0, 0), t3, font=font_tag)
    w3 = bbox3[2] - bbox3[0]
    draw.text((cx - w3//2, cy + 55), t3, font=font_tag, fill=(148, 163, 184, 230))

    img.save(out_path, "PNG")

def render_clip(scene, idx):
    """
    渲染单个高质量分镜头片段 (1920x1080 30fps，带微变焦运镜和淡入淡出HUD)
    """
    out_clip = os.path.join(CLIPS_DIR, f"clip_{idx:02d}.mp4")
    hud_png = os.path.join(HUD_DIR, f"hud_{idx:02d}.png")
    generate_hud_png(scene["tag"], scene["title"], scene["desc"], hud_png)

    dur = scene["dur"]
    print(f"[{idx+1}/{len(SCENES)}] 正在渲染分镜头: {scene['tag']} (时长: {dur}s)...")

    if scene["id"] == "scene_12_outro_brand":
        # 终章分镜：5秒大屏拉远 + 5秒品牌卡片 crossfade
        brand_png = os.path.join(OUTPUT_DIR, "brand_outro.png")
        generate_brand_card_png(brand_png)
        
        # 1. 前5秒大屏缓缓拉远
        sub1 = os.path.join(CLIPS_DIR, "sub_outro_1.mp4")
        cmd1 = [
            FFMPEG, "-y",
            "-ss", "0", "-t", "5.0",
            "-i", os.path.join(INPUT_DIR, "指标概况.mp4"),
            "-loop", "1", "-i", hud_png,
            "-filter_complex",
            "[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x080f1e,scale=w='1920*(1.06-0.06*t/5.0)':h='1080*(1.06-0.06*t/5.0)':eval=frame,crop=1920:1080:(in_w-1920)/2:(in_h-1080)/2[base];"
            "[1:v]format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1,fade=t=out:st=4.0:d=0.6:alpha=1[hud];"
            "[base][hud]overlay=0:0:shortest=1[out]",
            "-map", "[out]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
            sub1
        ]
        subprocess.run(cmd1, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 2. 后5秒品牌落版卡片
        sub2 = os.path.join(CLIPS_DIR, "sub_outro_2.mp4")
        cmd2 = [
            FFMPEG, "-y",
            "-loop", "1", "-t", "5.0",
            "-i", brand_png,
            "-vf", "scale=1920:1080,fade=t=out:st=4.2:d=0.8",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
            sub2
        ]
        subprocess.run(cmd2, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        # 3. 拼接 sub1 和 sub2 并带 0.8s crossfade
        cmd3 = [
            FFMPEG, "-y",
            "-i", sub1, "-i", sub2,
            "-filter_complex",
            "[0:v][1:v]xfade=transition=fade:duration=0.8:offset=4.2[out]",
            "-map", "[out]",
            "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
            out_clip
        ]
        subprocess.run(cmd3, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return out_clip, 9.2 # 5.0 + 5.0 - 0.8 = 9.2s

    # 常规镜头渲染
    # 运镜设计：微推镜头 1.0 -> 1.06 (摄影机缓缓推近，模拟真实专业演示运镜)
    # 居中居底暗调背景 0x080f1e (与平台现代大屏科技蓝完美融合)
    hud_stay = min(dur - 1.0, 5.0)
    filter_chain = (
        f"[0:v]scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2:color=0x080f1e,"
        f"scale=w='1920*(1+0.06*t/{dur})':h='1080*(1+0.06*t/{dur})':eval=frame,crop=1920:1080:(in_w-1920)/2:(in_h-1080)/2[base];"
        f"[1:v]format=rgba,fade=t=in:st=0.3:d=0.5:alpha=1,fade=t=out:st={hud_stay}:d=0.6:alpha=1[hud];"
        f"[base][hud]overlay=0:0:shortest=1[out]"
    )

    cmd = [
        FFMPEG, "-y",
        "-ss", str(scene["ss"]), "-t", str(dur),
        "-i", scene["file"],
        "-loop", "1", "-i", hud_png,
        "-filter_complex", filter_chain,
        "-map", "[out]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
        out_clip
    ]
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return out_clip, dur

def assemble_final_video(clip_durations):
    """
    使用 xfade 将所有分镜头进行无缝平滑 crossfade 转场融合
    """
    print("\n正在通过 xfade 链式引擎合成最终宣传片...")
    n = len(clip_durations)
    transition_dur = 0.8 # 转场持续 0.8 秒平滑溶解

    # 构建输入参数
    inputs = []
    for i in range(n):
        clip_path = os.path.join(CLIPS_DIR, f"clip_{i:02d}.mp4")
        inputs.extend(["-i", clip_path])

    # 构建 filter_complex 链
    # [0:v][1:v]xfade=transition=fade:duration=0.8:offset=offset_0[v01];
    # [v01][2:v]xfade=transition=fade:duration=0.8:offset=offset_1[v02];
    # ...
    filter_parts = []
    current_offset = clip_durations[0] - transition_dur
    last_v = "[0:v]"

    for i in range(1, n):
        next_v = f"[{i}:v]"
        out_v = f"[v_mix_{i}]" if i < n - 1 else "[final_out]"
        filter_parts.append(f"{last_v}{next_v}xfade=transition=fade:duration={transition_dur}:offset={current_offset:.2f}{out_v}")
        last_v = out_v
        if i < n - 1:
            current_offset += clip_durations[i] - transition_dur

    filter_complex_str = "; ".join(filter_parts)

    cmd = [
        FFMPEG, "-y",
        *inputs,
        "-filter_complex", filter_complex_str,
        "-map", "[final_out]",
        "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-r", "30",
        FINAL_VIDEO
    ]

    start_time = time.time()
    subprocess.run(cmd, check=True)
    cost = time.time() - start_time
    print(f"成片压制完成！耗时: {cost:.1f} 秒，输出文件: {FINAL_VIDEO}")

def main():
    print("=== 开始制作广咨造价数据平台 3分钟高清科技感宣传片 ===")
    total_raw_dur = 0
    clip_durations = []

    for i, scene in enumerate(SCENES):
        clip_path, actual_dur = render_clip(scene, i)
        clip_durations.append(actual_dur)
        total_raw_dur += actual_dur

    est_final_dur = total_raw_dur - (len(SCENES) - 1) * 0.8
    print(f"\n所有 12 个分镜头渲染完毕！总毛时长: {total_raw_dur:.1f}s，预计成片净时长: {est_final_dur:.1f}s (约 {est_final_dur/60:.1f} 分钟)")

    assemble_final_video(clip_durations)

    # 验证最终成片信息
    cmd_info = f"{FFMPEG} -i \"{FINAL_VIDEO}\" 2>&1 | grep -E 'Duration|Stream'"
    info_res = subprocess.check_output(cmd_info, shell=True, text=True)
    print("\n=== 最终成片媒体参数 ===")
    print(info_res.strip())
    print("=== 全部制作流程圆满完成 ===")

if __name__ == "__main__":
    main()
