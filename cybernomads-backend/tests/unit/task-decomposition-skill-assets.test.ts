import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("task decomposition skill assets", () => {
  const skillDirectory = join(
    process.cwd(),
    "runtime-assets",
    "agent",
    "skills",
    "cybernomads-task-decomposition",
  );

  it("keeps the skill body modular, step-based, and linked to tool references", async () => {
    const skill = await readFile(join(skillDirectory, "SKILL.md"), "utf8");

    expect(skill).toContain("name: cybernomads-task-decomposition");
    expect(skill).toContain("references/module-1-overview.md");
    expect(skill).toContain("references/module-7-self-check.md");
    expect(skill).toContain("references/module-3-task-contract.md");
    expect(skill).toContain("references/module-6-persist-task-set.md");
  });

  it("documents controlled tools, keeps one real traffic-work sample, and bundles executable script helpers", async () => {
    const controlledTools = await readFile(
      join(skillDirectory, "references", "controlled-tools.md"),
      "utf8",
    );
    const examples = await readFile(
      join(skillDirectory, "references", "examples.md"),
      "utf8",
    );
    const moduleOverview = await readFile(
      join(skillDirectory, "references", "module-1-overview.md"),
      "utf8",
    );

    expect(controlledTools).toContain(
      "/api/task-decomposition-support-tools/runtime-resource-copy",
    );
    expect(controlledTools).toContain(
      "/api/task-decomposition-support-tools/batch-save-tasks",
    );
    expect(examples).toContain("bilibili-web-api");
    expect(examples).toContain('mode = "create"');
    expect(examples).toContain("search-candidate-videos");
    expect(moduleOverview).toContain("scripts/copy-runtime-resource.js");
    expect(moduleOverview).toContain("scripts/batch-save-tasks.js");
    expect(moduleOverview).toContain("scripts/run-self-check.js");

    for (const scriptName of [
      "copy-runtime-resource.js",
      "batch-save-tasks.js",
      "run-self-check.js",
    ]) {
      const { stdout } = await execFileAsync(process.execPath, [
        join(skillDirectory, "scripts", scriptName),
        "--help",
      ]);

      expect(stdout).toContain("Usage:");
    }
  });

  it("keeps task documents focused on context, flow, and output collaboration", async () => {
    const template = await readFile(
      join(
        process.cwd(),
        "runtime-assets",
        "agent",
        "knowledge",
        "引流任务文档模板.md",
      ),
      "utf8",
    );
    const templateGuidance = await readFile(
      join(skillDirectory, "references", "task-document-template.md"),
      "utf8",
    );

    expect(template).toContain("## 3. 任务上下文前提");
    expect(template).toContain("## 4. 任务流程");
    expect(template).toContain("## 5. 任务产出与协作");
    expect(template).toContain("## 6. 任务自检");
    expect(template).toContain("## 7. 执行约束");
    expect(template).toContain("产出存在性");
    expect(template).toContain("数据结构合规性");
    expect(template).toContain("无产出原因");
    expect(template).toContain("```json");
    expect(template).toContain("required: false");
    expect(template).not.toContain("## 3. 执行条件");
    expect(template).not.toContain("## 4. 输入依赖");
    expect(templateGuidance).toContain(
      "`condition` 和 `inputPrompt` 只属于任务元数据",
    );
    expect(templateGuidance).toContain("不要作为独立章节写入任务 Markdown 文档");
    const taskShape = await readFile(
      join(skillDirectory, "references", "task-shape.md"),
      "utf8",
    );
    expect(taskShape).toContain('"contextRef": "./"');
    expect(taskShape).toContain("保存到数据库 `input_needs_json`");
    expect(taskShape).toContain("可以填写空字符串");
  });
});
