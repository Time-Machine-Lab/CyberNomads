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

  it("keeps the skill body structured, step-based, and linked to tool references", async () => {
    const skill = await readFile(join(skillDirectory, "SKILL.md"), "utf8");

    expect(skill).toContain("name: cybernomads-task-decomposition");
    expect(skill).toContain("scripts/copy-runtime-resource.js");
    expect(skill).toContain("scripts/batch-save-tasks.js");
    expect(skill).toContain("scripts/run-self-check.js");
    expect(skill).toContain("references/available-tools.md");
    expect(skill).toContain("references/self-checklist.md");
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

    expect(controlledTools).toContain(
      "/api/task-decomposition-support-tools/runtime-resource-copy",
    );
    expect(controlledTools).toContain(
      "/api/task-decomposition-support-tools/batch-save-tasks",
    );
    expect(examples).toContain("bilibili-web-api");
    expect(examples).toContain('mode = "create"');
    expect(examples).toContain("search-candidate-videos");

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
});
