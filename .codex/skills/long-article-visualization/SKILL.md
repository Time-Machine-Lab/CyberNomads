---
name: long-article-visualization
description: 将长文章转换为手绘风格的信息图。基于深度阅读、主题规划和视觉设计，最终调用 image-generation skill 生成图片。
---

# Long Article Visualization Skill

本 Skill 旨在将长文章（2000-3000字）转化为一组手绘风格的信息图。

为了确保高质量的输出，本 Skill 采用**渐进式执行**模式。请**严格按照以下顺序**一步步读取指令并执行，**切勿一次性读取所有步骤文件**。

## 执行流程

1.  **Step 1: 深度阅读与信息提取**
    *   **指令**: 请读取 [Step 1 指南](steps/step1_extraction.md)。
    *   **目标**: 识别核心论点和关键要素。
    *   **操作**: 读取文件，按要求分析文章，输出提取报告。

2.  **Step 2: 主题分组与张数规划**
    *   **指令**: 完成 Step 1 后，请读取 [Step 2 指南](steps/step2_planning.md)。
    *   **目标**: 确定图片数量和叙事逻辑。
    *   **操作**: 基于 Step 1 的结果，输出图片规划方案。

3.  **Step 3: 视觉元素设计**
    *   **指令**: 完成 Step 2 后，请读取 [Step 3 指南](steps/step3_design.md)。
    *   **目标**: 为每张图设计具体的画面和布局。
    *   **操作**: 基于 Step 2 的结果，输出详细的视觉设计方案。

4.  **Step 4: 生成信息图**
    *   **指令**: 完成 Step 3 后，请读取 [Step 4 指南](steps/step4_generation.md)。
    *   **目标**: 产出最终图片。
    *   **操作**: 调用 `image-generation` skill 生成图片。

请从 Step 1 开始。
