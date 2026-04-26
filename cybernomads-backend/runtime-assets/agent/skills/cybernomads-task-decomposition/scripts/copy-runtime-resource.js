import {
  failWithHelp,
  parseCliArgs,
  readOption,
  requestJson,
  writeJsonOutput,
} from "./shared/common.js";

const HELP_TEXT = `Usage:
  node scripts/copy-runtime-resource.js \\
    --traffic-work-id <trafficWorkId> \\
    --resource-type <skill|knowledge> \\
    --resource-path <runtimeRelativePath> \\
    [--backend-url <url>] \\
    [--output <file>]

Examples:
  node scripts/copy-runtime-resource.js --traffic-work-id work-1 --resource-type skill --resource-path cybernomads-task-execution
  node scripts/copy-runtime-resource.js --traffic-work-id work-1 --resource-type knowledge --resource-path Agent资源清单.md --output ./data/task-decomposition/copy-knowledge.json
`;

const parsedArgs = parseCliArgs(process.argv.slice(2));

if (parsedArgs.flags.has("help")) {
  failWithHelp("", HELP_TEXT);
} else {
  try {
    const trafficWorkId = readOption(parsedArgs, "traffic-work-id", {
      required: true,
    });
    const resourceType = readOption(parsedArgs, "resource-type", {
      required: true,
    });
    const resourcePath = readOption(parsedArgs, "resource-path", {
      required: true,
    });
    const backendUrl = readOption(parsedArgs, "backend-url");
    const output = readOption(parsedArgs, "output");

    if (resourceType !== "skill" && resourceType !== "knowledge") {
      throw new Error('Option "--resource-type" must be "skill" or "knowledge".');
    }

    const result = await requestJson({
      backendUrl,
      pathname: "/api/task-decomposition-support-tools/runtime-resource-copy",
      method: "POST",
      body: {
        trafficWorkId,
        resourceType,
        resourcePath,
      },
    });

    await writeJsonOutput(result, output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failWithHelp(message, HELP_TEXT);
  }
}
