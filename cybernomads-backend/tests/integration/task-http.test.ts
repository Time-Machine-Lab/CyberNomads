import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";

describe.sequential("task module http api", () => {
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

  it("creates, lists, reads, updates, records outputs, and replaces task sets", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);
    await seedTrafficWork(runtimePaths.databaseFile, "work-1", "ready");

    const createTaskSetResponse = await fetch(
      `${application.http.url}/api/traffic-works/work-1/task-set`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: {
            kind: "agent-decomposition",
          },
          tasks: [
            createTaskDraft("collect", "Collect candidates", []),
            createTaskDraft("comment", "Comment candidates", ["collect"]),
          ],
        }),
      },
    );

    expect(createTaskSetResponse.status).toBe(201);
    const createdTaskSet = (await createTaskSetResponse.json()) as {
      trafficWorkId: string;
      taskCount: number;
      tasks: Array<{ taskKey: string; taskId: string }>;
    };
    expect(createdTaskSet.trafficWorkId).toBe("work-1");
    expect(createdTaskSet.taskCount).toBe(2);
    const collectTaskId = createdTaskSet.tasks[0]?.taskId;
    const commentTaskId = createdTaskSet.tasks[1]?.taskId;
    expect(collectTaskId).toBeTruthy();
    expect(commentTaskId).toBeTruthy();

    const listResponse = await fetch(
      `${application.http.url}/api/tasks?trafficWorkId=work-1`,
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      items: Array<{ taskId: string; status: string }>;
    };
    expect(listPayload.items).toHaveLength(2);
    expect(listPayload.items.every((item) => item.status === "ready")).toBe(
      true,
    );

    const detailResponse = await fetch(
      `${application.http.url}/api/tasks/${commentTaskId}`,
    );
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      taskId: commentTaskId,
      trafficWorkId: "work-1",
      name: "Comment candidates",
      condition: {
        relyOnTaskIds: [collectTaskId],
      },
      inputPrompt:
        "Read upstream task data from ./data/collect.json and use it as execution input.",
    });

    const statusResponse = await fetch(
      `${application.http.url}/api/tasks/${commentTaskId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "running",
          statusReason: "Planner submitted the task.",
        }),
      },
    );
    expect(statusResponse.status).toBe(200);
    await expect(statusResponse.json()).resolves.toMatchObject({
      status: "running",
      statusReason: "Planner submitted the task.",
    });

    const outputResponse = await fetch(
      `${application.http.url}/api/tasks/${commentTaskId}/outputs`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          description: "Comment draft list",
          dataLocation: "work/work-1/task-data/comments.json",
        }),
      },
    );
    expect(outputResponse.status).toBe(201);
    const output = (await outputResponse.json()) as { outputRecordId: string };
    expect(output.outputRecordId).toBeTruthy();

    const outputListResponse = await fetch(
      `${application.http.url}/api/tasks/${commentTaskId}/outputs`,
    );
    expect(outputListResponse.status).toBe(200);
    await expect(outputListResponse.json()).resolves.toMatchObject({
      items: [
        {
          taskId: commentTaskId,
          description: "Comment draft list",
          dataLocation: "work/work-1/task-data/comments.json",
        },
      ],
    });

    const replaceResponse = await fetch(
      `${application.http.url}/api/traffic-works/work-1/task-set`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: {
            kind: "agent-decomposition",
          },
          tasks: [createTaskDraft("refresh", "Refresh candidates", [])],
        }),
      },
    );
    expect(replaceResponse.status).toBe(200);
    const replacedTaskSet = (await replaceResponse.json()) as {
      taskCount: number;
      tasks: Array<{ taskKey: string; taskId: string }>;
    };
    expect(replacedTaskSet.taskCount).toBe(1);
    expect(replacedTaskSet.tasks[0]?.taskKey).toBe("refresh");

    const oldTaskResponse = await fetch(
      `${application.http.url}/api/tasks/${commentTaskId}`,
    );
    expect(oldTaskResponse.status).toBe(404);
  });

  it("rejects invalid status and running-work task set replacement", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);
    await seedTrafficWork(runtimePaths.databaseFile, "work-1", "ready");
    await seedTrafficWork(runtimePaths.databaseFile, "work-2", "running");
    await seedTrafficWork(runtimePaths.databaseFile, "work-3", "ready");

    const createTaskSetResponse = await fetch(
      `${application.http.url}/api/traffic-works/work-3/task-set`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: {
            kind: "agent-decomposition",
          },
          tasks: [createTaskDraft("collect", "Collect candidates", [])],
        }),
      },
    );
    expect(createTaskSetResponse.status).toBe(201);
    const createdTaskSet = (await createTaskSetResponse.json()) as {
      tasks: Array<{ taskId: string }>;
    };
    const taskId = createdTaskSet.tasks[0]?.taskId;

    const invalidStatusResponse = await fetch(
      `${application.http.url}/api/tasks/${taskId}/status`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "blocked",
        }),
      },
    );
    expect(invalidStatusResponse.status).toBe(400);

    const invalidTaskSetResponse = await fetch(
      `${application.http.url}/api/traffic-works/work-1/task-set`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: {
            kind: "agent-decomposition",
          },
          tasks: [
            {
              taskKey: "broken",
              name: "Broken task",
              instruction: "Broken instruction.",
              documentRef: "broken.md",
              contextRef: "",
              condition: {
                cron: null,
                relyOnTaskKeys: [],
              },
              inputPrompt: "",
            },
          ],
        }),
      },
    );
    expect(invalidTaskSetResponse.status).toBe(400);
    await expect(invalidTaskSetResponse.json()).resolves.toMatchObject({
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

    const replaceRunningResponse = await fetch(
      `${application.http.url}/api/traffic-works/work-2/task-set`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: {
            kind: "agent-decomposition",
          },
          tasks: [createTaskDraft("collect", "Collect candidates", [])],
        }),
      },
    );
    expect(replaceRunningResponse.status).toBe(409);
  });

  it("reads legacy array-shaped input values as execution input prompts", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);
    await seedTrafficWork(runtimePaths.databaseFile, "work-legacy", "ready");

    const database = new DatabaseSync(runtimePaths.databaseFile);
    database
      .prepare(
        `
          INSERT INTO tasks (
            task_id,
            traffic_work_id,
            task_key,
            name,
            instruction,
            document_ref,
            context_ref,
            condition_json,
            input_needs_json,
            status,
            status_reason,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        "legacy-task-1",
        "work-legacy",
        "legacy-collect",
        "Legacy collect",
        "Use legacy input payload.",
        "legacy-collect.md",
        "work/work-legacy/legacy-collect",
        JSON.stringify({
          cron: null,
          relyOnTaskIds: [],
        }),
        JSON.stringify([
          {
            name: "candidate-video-list",
            description: "Candidate videos produced by the upstream task.",
            source: "./data/search-candidate-videos.json",
          },
        ]),
        "ready",
        null,
        "2026-04-23T08:00:00.000Z",
        "2026-04-23T08:00:00.000Z",
      );
    database.close();

    const response = await fetch(
      `${application.http.url}/api/tasks/legacy-task-1`,
    );
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      taskId: string;
      inputPrompt: string;
    };
    expect(payload).toMatchObject({
      taskId: "legacy-task-1",
    });
    expect(payload.inputPrompt).toContain(
      "Execution input guidance converted from legacy task input needs:",
    );
    expect(payload.inputPrompt).toContain(
      "Source: ./data/search-candidate-videos.json",
    );
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-task-module-"),
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
      "Prepared for task HTTP test.",
      "2026-04-23T08:00:00.000Z",
      lifecycleStatus === "running" ? "2026-04-23T08:01:00.000Z" : null,
      null,
      null,
      null,
      "2026-04-23T08:00:00.000Z",
      "2026-04-23T08:00:00.000Z",
    );
  database.close();
}
