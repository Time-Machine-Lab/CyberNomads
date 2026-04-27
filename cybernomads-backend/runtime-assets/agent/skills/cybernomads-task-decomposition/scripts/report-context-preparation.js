import {
  failWithHelp,
  parseCliArgs,
  readOption,
  requestJson,
  writeJsonOutput,
} from "./shared/common.js";

const HELP_TEXT = `Usage:
  node scripts/report-context-preparation.js \\
    --traffic-work-id <trafficWorkId> \\
    --status <prepared|failed> \\
    [--reason <text>] \\
    [--backend-url <url>] \\
    [--output <file>]

Examples:
  node scripts/report-context-preparation.js --traffic-work-id work-1 --status prepared --output ./data/task-decomposition/preparation-status.json
  node scripts/report-context-preparation.js --traffic-work-id work-1 --status failed --reason "Task docs generation failed" --output ./data/task-decomposition/preparation-status.json
`;

const parsedArgs = parseCliArgs(process.argv.slice(2));

if (parsedArgs.flags.has("help")) {
  failWithHelp("", HELP_TEXT);
} else {
  try {
    const trafficWorkId = readOption(parsedArgs, "traffic-work-id", {
      required: true,
    });
    const status = readOption(parsedArgs, "status", {
      required: true,
    });
    const reason = readOption(parsedArgs, "reason");
    const backendUrl = readOption(parsedArgs, "backend-url");
    const output = readOption(parsedArgs, "output");

    if (status !== "prepared" && status !== "failed") {
      throw new Error('Option "--status" must be "prepared" or "failed".');
    }

    if (status === "failed" && (!reason || reason.trim().length === 0)) {
      throw new Error(
        'Option "--reason" is required when "--status failed" is used.',
      );
    }

    const result = await requestJson({
      backendUrl,
      pathname:
        "/api/task-decomposition-support-tools/context-preparation-status",
      method: "POST",
      body: {
        trafficWorkId,
        status,
        ...(reason ? { reason } : {}),
      },
    });

    await writeJsonOutput(result, output);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    failWithHelp(message, HELP_TEXT);
  }
}
