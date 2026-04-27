import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";

describe.sequential("task decomposition support tools http api", () => {
  const temporaryDirectories: string[] = [];
  const applications: ApplicationReadyState[] = [];

  afterAll(async () => {
    await Promise.all(applications.map((application) => application.close()));
    await Promise.all(
      temporaryDirectories.map((temporaryDirectory) =>
        rm(temporaryDirectory, { recursive: true, force: true }),
      ),
    );
  });

  it("copies runtime resources and batch-saves tasks through controlled tool routes", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);
    await seedTrafficWork(runtimePaths.databaseFile, "work-1", "ready");

    const copySkillResponse = await fetch(
      `${application.http.url}/api/task-decomposition-support-tools/runtime-resource-copy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafficWorkId: "work-1",
          resourceType: "skill",
          resourcePath: "bilibili-web-api",
        }),
      },
    );
    expect(copySkillResponse.status).toBe(200);
    await expect(
      access(
        join(
          runtimePaths.workDirectory,
          "work-1",
          "skills",
          "bilibili-web-api",
          "SKILL.md",
        ),
      ),
    ).resolves.toBeUndefined();

    const copyKnowledgeResponse = await fetch(
      `${application.http.url}/api/task-decomposition-support-tools/runtime-resource-copy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafficWorkId: "work-1",
          resourceType: "knowledge",
          resourcePath: "Agent资源清单.md",
        }),
      },
    );
    expect(copyKnowledgeResponse.status).toBe(200);
    await expect(
      readFile(
        join(
          runtimePaths.workDirectory,
          "work-1",
          "knowledge",
          "Agent资源清单.md",
        ),
        "utf8",
      ),
    ).resolves.toContain("Skill 清单");

    const batchSaveResponse = await fetch(
      `${application.http.url}/api/task-decomposition-support-tools/batch-save-tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafficWorkId: "work-1",
          mode: "create",
          taskSet: {
            source: {
              kind: "agent-decomposition",
            },
            tasks: [
              createTaskDraft("collect", "Collect candidates", []),
              createTaskDraft("comment", "Comment candidates", ["collect"]),
            ],
          },
        }),
      },
    );
    expect(batchSaveResponse.status).toBe(201);
    await expect(batchSaveResponse.json()).resolves.toMatchObject({
      mode: "create",
      trafficWorkId: "work-1",
      taskCount: 2,
    });
  });

  it("returns explicit failure reasons for boundary violations and invalid task batches", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);
    await seedTrafficWork(runtimePaths.databaseFile, "work-1", "ready");

    const boundaryViolationResponse = await fetch(
      `${application.http.url}/api/task-decomposition-support-tools/runtime-resource-copy`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafficWorkId: "work-1",
          resourceType: "skill",
          resourcePath: "../outside",
        }),
      },
    );
    expect(boundaryViolationResponse.status).toBe(400);
    await expect(boundaryViolationResponse.json()).resolves.toMatchObject({
      code: "TASK_DECOMPOSITION_TOOL_BOUNDARY_VIOLATION",
    });

    const invalidBatchResponse = await fetch(
      `${application.http.url}/api/task-decomposition-support-tools/batch-save-tasks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          trafficWorkId: "work-1",
          mode: "create",
          taskSet: {
            source: {
              kind: "agent-decomposition",
            },
            tasks: [
              {
                taskKey: "collect",
                name: "Collect candidates",
                instruction: "Collect candidates instruction.",
                documentRef: "collect.md",
                contextRef: "",
                condition: {
                  cron: null,
                  relyOnTaskKeys: [],
                },
                inputPrompt: "",
              },
            ],
          },
        }),
      },
    );
    expect(invalidBatchResponse.status).toBe(400);
    await expect(invalidBatchResponse.json()).resolves.toMatchObject({
      code: "TASK_VALIDATION_FAILED",
      details: {
        issues: [
          {
            path: "tasks[0].contextRef",
            message: "Task contextRef is required.",
          },
        ],
      },
    });
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-task-tools-"),
  );
  temporaryDirectories.push(workingDirectory);

  const application = await startApplication({
    workingDirectory,
    port: 0,
  });
  applications.push(application);

  return {
    application,
    workingDirectory,
  };
}

function createTaskDraft(
  taskKey: string,
  name: string,
  relyOnTaskKeys: string[],
) {
  return {
    taskKey,
    name,
    instruction: `${name} instruction.`,
    documentRef: `${taskKey}.md`,
    contextRef: `work/work-1/${taskKey}`,
    condition: {
      cron: null,
      relyOnTaskKeys,
    },
    inputPrompt:
      "Read upstream task data from ./data/collect.json and use it as execution input.",
  };
}

async function seedTrafficWork(
  databaseFile: string,
  trafficWorkId: string,
  lifecycleStatus: "ready" | "running",
): Promise<void> {
  const database = new DatabaseSync(databaseFile);
  database
    .prepare(
      `
        INSERT INTO traffic_works (
          traffic_work_id,
          display_name,
          product_id,
          strategy_id,
          object_bindings_json,
          lifecycle_status,
          lifecycle_status_reason,
          context_preparation_status,
          context_preparation_status_reason,
          context_prepared_at,
          last_started_at,
          ended_at,
          archived_at,
          deleted_at,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      trafficWorkId,
      `Traffic Work ${trafficWorkId}`,
      "product-1",
      "strategy-1",
      "[]",
      lifecycleStatus,
      null,
      "prepared",
      "Prepared for tool HTTP test.",
      "2026-04-25T08:00:00.000Z",
      lifecycleStatus === "running" ? "2026-04-25T08:01:00.000Z" : null,
      null,
      null,
      null,
      "2026-04-25T08:00:00.000Z",
      "2026-04-25T08:00:00.000Z",
    );
  database.close();
}
