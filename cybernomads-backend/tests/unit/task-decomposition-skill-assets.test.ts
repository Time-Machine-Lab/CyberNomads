import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("task decomposition skill assets", () => {
  const skillDirectory = join(
    process.cwd(),
    "runtime-assets",
    "agent",
    "skills",
    "cybernomads-task-decomposition",
  );

  it("keeps the skill body structured and links the required references", async () => {
    const skill = await readFile(join(skillDirectory, "SKILL.md"), "utf8");

    expect(skill).toContain("name: cybernomads-task-decomposition");
    expect(skill).toContain("references/work-context-layout.md");
    expect(skill).toContain("references/runtime-resource-selection.md");
    expect(skill).toContain("references/self-checklist.md");
  });

  it("documents controlled tools and keeps one real traffic-work sample", async () => {
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
  });
});
