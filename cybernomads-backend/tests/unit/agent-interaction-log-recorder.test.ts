import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  FileSystemAgentInteractionLogRecorder,
  formatAgentInteractionLogEvent,
} from "../../src/adapters/storage/file-system/agent-interaction-log-recorder.js";

describe("agent interaction log recorder", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    await Promise.all(
      temporaryDirectories
        .splice(0)
        .map((directory) => rm(directory, { recursive: true, force: true })),
    );
  });

  it("formats structured log blocks with redacted sensitive values", () => {
    const text = formatAgentInteractionLogEvent(
      {
        scope: {
          kind: "traffic-work",
          trafficWorkId: "work-1",
        },
        eventType: "task-decomposition-accepted",
        occurredAt: "2026-05-11T08:00:00.000Z",
        summary: "Accepted with Authorization: Bearer raw-secret-token",
        decisionSummary: "Only provider-visible decision notes are captured.",
        correlation: {
          trafficWorkId: "work-1",
          sessionId: "session-1",
        },
        skills: ["cybernomads-task-decomposition"],
        toolCalls: [
          {
            name: "batchSaveTasks",
            status: "completed",
            input: {
              token: "raw-secret-token",
              providerSecret: "raw-provider-secret",
            },
          },
        ],
        messages: [
          {
            role: "tool",
            content:
              "tool output with apiKey=raw-api-key and Authorization: Bearer raw-auth-token",
            createdAt: "2026-05-11T08:00:01.000Z",
          },
        ],
        payload: {
          secret: "raw-secret-token",
          apiKey: "raw-api-key",
          providerSecret: "raw-provider-secret",
          authorization: "Bearer raw-auth-token",
        },
      },
      () => new Date("2026-05-11T08:00:00.000Z"),
    );

    expect(text).toContain(
      "## 2026-05-11T08:00:00.000Z | task-decomposition-accepted",
    );
    expect(text).toContain("Scope: traffic-work:work-1");
    expect(text).toContain("Skills:");
    expect(text).toContain("Tool Calls:");
    expect(text).toContain("### Message 1 | tool");
    expect(text).toContain("[REDACTED]");
    expect(text).not.toContain("raw-secret-token");
    expect(text).not.toContain("raw-api-key");
    expect(text).not.toContain("raw-provider-secret");
    expect(text).not.toContain("raw-auth-token");
  });

  it("writes deterministic .logs files and skips writes when disabled", async () => {
    const logsDirectory = await createTemporaryDirectory(
      "agent-logs-",
      temporaryDirectories,
    );
    const recorder = new FileSystemAgentInteractionLogRecorder({
      logsDirectory,
      now: () => new Date("2026-05-11T08:00:00.000Z"),
    });

    await recorder.appendEvent({
      scope: {
        kind: "task",
        taskId: "task 1",
      },
      eventType: "task-execution-submitted",
      summary: "Submitted task execution.",
    });

    const text = await readFile(join(logsDirectory, "tasks", "task-1.logs"), {
      encoding: "utf8",
    });
    expect(text).toContain("task-execution-submitted");

    const disabledRecorder = new FileSystemAgentInteractionLogRecorder({
      logsDirectory,
      enabled: false,
    });
    await disabledRecorder.appendEvent({
      scope: {
        kind: "task",
        taskId: "task-disabled",
      },
      eventType: "task-execution-submitted",
    });

    await expect(
      readFile(join(logsDirectory, "tasks", "task-disabled.logs"), "utf8"),
    ).rejects.toThrow();
  });
});

async function createTemporaryDirectory(
  prefix: string,
  temporaryDirectories: string[],
): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}
