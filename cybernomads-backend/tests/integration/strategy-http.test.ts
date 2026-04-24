import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";

describe.sequential("strategy module http api", () => {
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

  it("creates, lists, updates, and reads strategy details with persisted markdown content and parsed placeholders", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const createResponse = await fetch(
      `${application.http.url}/api/strategies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "引流策略",
          tags: ["growth", "mvp", "growth"],
          contentMarkdown: [
            "<!-- s:seed-1 -->",
            '# {{string:title="默认标题"}}',
            "",
            "重试次数：{{int:max_retry=3}}",
            '重复标题：{{string:title="默认标题"}}',
            "<!-- /s -->",
          ].join("\n"),
        }),
      },
    );

    expect(createResponse.status).toBe(201);

    const createdStrategy = (await createResponse.json()) as {
      strategyId: string;
      name: string;
      summary: string;
      tags: string[];
      contentMarkdown: string;
      placeholders: Array<Record<string, unknown>>;
      createdAt: string;
      updatedAt: string;
    };

    expect(createdStrategy.name).toBe("引流策略");
    expect(createdStrategy.summary).toBe("默认标题");
    expect(createdStrategy.tags).toEqual(["growth", "mvp"]);
    expect(createdStrategy.placeholders).toEqual([
      {
        type: "string",
        key: "title",
        defaultValue: "默认标题",
      },
      {
        type: "int",
        key: "max_retry",
        defaultValue: 3,
      },
    ]);
    expect(createdStrategy.createdAt).toBe(createdStrategy.updatedAt);

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const databaseRow = database
      .prepare(
        `
          SELECT content_ref AS contentRef, summary, tags_json AS tagsJson
          FROM strategies
          WHERE strategy_id = ?
        `,
      )
      .get(createdStrategy.strategyId) as
      | { contentRef: string; summary: string; tagsJson: string }
      | undefined;
    database.close();

    expect(databaseRow?.contentRef).toBe(`${createdStrategy.strategyId}.md`);
    expect(databaseRow?.summary).toBe("默认标题");
    expect(databaseRow?.tagsJson).toBe('["growth","mvp"]');

    const contentPath = join(
      runtimePaths.strategyDirectory,
      databaseRow!.contentRef,
    );
    await expect(access(contentPath)).resolves.toBeUndefined();
    await expect(readFile(contentPath, "utf8")).resolves.toBe(
      createdStrategy.contentMarkdown,
    );

    const listResponse = await fetch(`${application.http.url}/api/strategies`);
    expect(listResponse.status).toBe(200);

    const listPayload = (await listResponse.json()) as {
      items: Array<Record<string, unknown>>;
    };
    expect(listPayload.items).toEqual([
      {
        strategyId: createdStrategy.strategyId,
        name: "引流策略",
        summary: "默认标题",
        tags: ["growth", "mvp"],
        updatedAt: createdStrategy.updatedAt,
      },
    ]);
    expect(listPayload.items[0]).not.toHaveProperty("contentMarkdown");
    expect(listPayload.items[0]).not.toHaveProperty("placeholders");

    const detailResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}`,
    );
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toEqual(createdStrategy);

    const updateResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "引流策略升级版",
          summary: "升级版摘要",
          tags: ["stable"],
          contentMarkdown: [
            '# {{string:title="升级标题"}}',
            "",
            '按钮：{{string:cta_text="立即开始"}}',
            '按钮重复：{{string:cta_text="立即开始"}}',
          ].join("\n"),
        }),
      },
    );
    expect(updateResponse.status).toBe(200);

    const updatedStrategy = (await updateResponse.json()) as {
      strategyId: string;
      name: string;
      summary: string;
      tags: string[];
      contentMarkdown: string;
      placeholders: Array<Record<string, unknown>>;
      createdAt: string;
      updatedAt: string;
    };

    expect(updatedStrategy.strategyId).toBe(createdStrategy.strategyId);
    expect(updatedStrategy.name).toBe("引流策略升级版");
    expect(updatedStrategy.summary).toBe("升级版摘要");
    expect(updatedStrategy.tags).toEqual(["stable"]);
    expect(updatedStrategy.placeholders).toEqual([
      {
        type: "string",
        key: "title",
        defaultValue: "升级标题",
      },
      {
        type: "string",
        key: "cta_text",
        defaultValue: "立即开始",
      },
    ]);
    expect(updatedStrategy.createdAt).toBe(createdStrategy.createdAt);
    expect(updatedStrategy.updatedAt).not.toBe(createdStrategy.updatedAt);

    await expect(readFile(contentPath, "utf8")).resolves.toBe(
      updatedStrategy.contentMarkdown,
    );

    const deleteResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}`,
      {
        method: "DELETE",
      },
    );
    expect(deleteResponse.status).toBe(204);

    const deletedDetailResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}`,
    );
    expect(deletedDetailResponse.status).toBe(404);
  });

  it("rejects invalid placeholder syntax and returns 404 for missing strategy detail", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const invalidResponse = await fetch(
      `${application.http.url}/api/strategies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "无效策略",
          contentMarkdown:
            '{{string:title="标题"}} {{int:title=2}} {{string:broken=未加引号}}',
        }),
      },
    );

    expect(invalidResponse.status).toBe(400);
    await expect(invalidResponse.json()).resolves.toMatchObject({
      code: "STRATEGY_VALIDATION_FAILED",
    });

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const countRow = database
      .prepare("SELECT COUNT(*) AS count FROM strategies")
      .get() as { count: number };
    database.close();
    expect(countRow.count).toBe(0);

    const detailResponse = await fetch(
      `${application.http.url}/api/strategies/missing-strategy`,
    );
    expect(detailResponse.status).toBe(404);
    await expect(detailResponse.json()).resolves.toMatchObject({
      code: "STRATEGY_NOT_FOUND",
    });
  });

  it("exposes deletion but still does not expose compile endpoints, binding results, or relation tables in mvp", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const createResponse = await fetch(
      `${application.http.url}/api/strategies`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "MVP 策略",
          contentMarkdown: '# {{string:title="标题"}}',
        }),
      },
    );
    const createdStrategy = (await createResponse.json()) as {
      strategyId: string;
    };

    const deleteResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}`,
      {
        method: "DELETE",
      },
    );
    expect(deleteResponse.status).toBe(204);

    const compileResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}/compile`,
      {
        method: "POST",
      },
    );
    expect(compileResponse.status).toBe(404);

    const detailResponse = await fetch(
      `${application.http.url}/api/strategies/${createdStrategy.strategyId}`,
    );
    expect(detailResponse.status).toBe(404);
    const detailPayload = (await detailResponse.json()) as Record<string, unknown>;

    expect(detailPayload).toMatchObject({
      code: "STRATEGY_NOT_FOUND",
    });

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const relationTables = database
      .prepare(
        `
          SELECT name
          FROM sqlite_master
          WHERE type = 'table'
            AND name IN ('strategy_imports', 'strategy_bindings')
        `,
      )
      .all() as Array<{ name: string }>;
    database.close();

    expect(relationTables).toEqual([]);
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-strategy-module-"),
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
