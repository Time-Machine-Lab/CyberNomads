import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface RunJsonScriptCommandOptions {
  cwd: string;
  scriptPath: string;
  args: string[];
  timeoutMs?: number;
}

export async function runJsonScriptCommand(
  options: RunJsonScriptCommandOptions,
): Promise<unknown> {
  const { stdout } = await execFileAsync(
    process.execPath,
    [options.scriptPath, ...options.args],
    {
      cwd: options.cwd,
      timeout: options.timeoutMs ?? 15_000,
      maxBuffer: 1_000_000,
    },
  );

  return JSON.parse(stdout);
}
