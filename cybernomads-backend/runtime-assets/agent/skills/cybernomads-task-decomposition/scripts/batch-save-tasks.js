import {
  failWithHelp,
  parseCliArgs,
  readJsonFile,
  readOption,
  requestJson,
  writeJsonOutput,
} from "./shared/common.js";
import { validateTaskSet } from "./shared/task-set.js";

const HELP_TEXT = `Usage:
  node scripts/batch-save-tasks.js \\
    --traffic-work-id <trafficWorkId> \\
    --mode <create|replace> \\
    --task-set-file <taskSetJsonFile> \\
    [--backend-url <url>] \\
    [--output <file>]

Examples:
  node scripts/batch-save-tasks.js --traffic-work-id work-1 --mode create --task-set-file ./data/task-decomposition/task-set.json
  node scripts/batch-save-tasks.js --traffic-work-id work-1 --mode replace --task-set-file ./data/task-decomposition/task-set.json --output ./data/task-decomposition/save-result.json
`;

const parsedArgs = parseCliArgs(process.argv.slice(2));

if (parsedArgs.flags.has("help")) {
  failWithHelp("", HELP_TEXT);
} else {
  try {
    const trafficWorkId = readOption(parsedArgs, "traffic-work-id", {
      required: true,
    });
    const mode = readOption(parsedArgs, "mode", {
      required: true,
    });
    const taskSetFile = readOption(parsedArgs, "task-set-file", {
      required: true,
    });
    const backendUrl = readOption(parsedArgs, "backend-url");
    const output = readOption(parsedArgs, "output");

    if (mode !== "create" && mode !== "replace") {
      throw new Error('Option "--mode" must be "create" or "replace".');
    }

    const taskSet = await readJsonFile(taskSetFile);
    const issues = validateTaskSet(taskSet);

    if (issues.length > 0) {
      throw new Error(
        `Task set validation failed: ${issues.map((issue) => `${issue.path}: ${issue.message}`).join("; ")}`,
      );
    }

    const result = await requestJson({
      backendUrl,
      pathname: "/api/task-decomposition-support-tools/batch-save-tasks",
      method: "POST",
      body: {
        trafficWorkId,
        mode,
        taskSet,
      },
    });

    await writeJsonOutput(result, output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failWithHelp(message, HELP_TEXT);
  }
}
