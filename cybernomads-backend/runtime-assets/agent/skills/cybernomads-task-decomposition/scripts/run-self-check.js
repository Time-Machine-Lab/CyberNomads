import {
  failWithHelp,
  parseCliArgs,
  readJsonFile,
  readOption,
  writeJsonOutput,
} from "./shared/common.js";
import { validateTaskSet } from "./shared/task-set.js";

const HELP_TEXT = `Usage:
  node scripts/run-self-check.js \\
    --task-set-file <taskSetJsonFile> \\
    [--save-result-file <saveResultJsonFile>] \\
    [--copy-result-file <copyResultJsonFile>]... \\
    [--require-saved] \\
    [--require-skill <skillName>]... \\
    [--output <file>]

Examples:
  node scripts/run-self-check.js --task-set-file ./data/task-decomposition/task-set.json --require-saved
  node scripts/run-self-check.js --task-set-file ./data/task-decomposition/task-set.json --save-result-file ./data/task-decomposition/save-result.json --copy-result-file ./data/task-decomposition/copy-skill-cybernomads-task-execution.json --require-skill cybernomads-task-execution --output ./data/task-decomposition/self-check-report.json
`;

const parsedArgs = parseCliArgs(process.argv.slice(2));

if (parsedArgs.flags.has("help")) {
  failWithHelp("", HELP_TEXT);
} else {
  try {
    const taskSetFile = readOption(parsedArgs, "task-set-file", {
      required: true,
    });
    const saveResultFile = readOption(parsedArgs, "save-result-file");
    const copyResultFiles = readOption(parsedArgs, "copy-result-file", {
      multiple: true,
      defaultValue: [],
    });
    const requiredSkills = readOption(parsedArgs, "require-skill", {
      multiple: true,
      defaultValue: [],
    });
    const requireSaved = parsedArgs.flags.has("require-saved");
    const output = readOption(parsedArgs, "output");

    const taskSet = await readJsonFile(taskSetFile);
    const taskSetIssues = validateTaskSet(taskSet);
    const copyResults = await Promise.all(
      copyResultFiles.map((file) => readJsonFile(file)),
    );
    const saveResult = saveResultFile ? await readJsonFile(saveResultFile) : null;
    const checks = [];

    checks.push({
      name: "task-set-valid",
      ok: taskSetIssues.length === 0,
      detail:
        taskSetIssues.length === 0
          ? "Task set structure is valid."
          : taskSetIssues.map((issue) => `${issue.path}: ${issue.message}`).join("; "),
    });

    checks.push({
      name: "task-set-has-tasks",
      ok: Array.isArray(taskSet.tasks) && taskSet.tasks.length > 0,
      detail: `Task count: ${Array.isArray(taskSet.tasks) ? taskSet.tasks.length : 0}`,
    });

    if (requireSaved) {
      if (!saveResult) {
        checks.push({
          name: "save-result-present",
          ok: false,
          detail: "Save result file is required but missing.",
        });
      } else {
        const taskKeys = new Set((taskSet.tasks ?? []).map((task) => task.taskKey));
        const savedTaskKeys = new Set((saveResult.tasks ?? []).map((task) => task.taskKey));
        const hasSameTaskCount = saveResult.taskCount === (taskSet.tasks ?? []).length;
        const hasSameTaskKeys =
          taskKeys.size === savedTaskKeys.size &&
          [...taskKeys].every((taskKey) => savedTaskKeys.has(taskKey));

        checks.push({
          name: "save-result-matches-task-set",
          ok: hasSameTaskCount && hasSameTaskKeys,
          detail: `Saved ${saveResult.taskCount ?? 0} tasks for ${(taskSet.tasks ?? []).length} planned tasks.`,
        });
      }
    }

    for (const skillName of requiredSkills) {
      const matched = copyResults.some(
        (result) =>
          result?.resourceType === "skill" &&
          (String(result.sourceRuntimeRelativePath ?? "").includes(`/${skillName}`) ||
            String(result.targetRuntimeRelativePath ?? "").includes(`/${skillName}`)),
      );

      checks.push({
        name: `required-skill:${skillName}`,
        ok: matched,
        detail: matched
          ? `Required skill "${skillName}" was copied.`
          : `Required skill "${skillName}" was not found in copy results.`,
      });
    }

    const report = {
      ok: checks.every((check) => check.ok),
      generatedAt: new Date().toISOString(),
      checks,
    };

    await writeJsonOutput(report, output);
    process.exitCode = report.ok ? 0 : 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failWithHelp(message, HELP_TEXT);
  }
}
