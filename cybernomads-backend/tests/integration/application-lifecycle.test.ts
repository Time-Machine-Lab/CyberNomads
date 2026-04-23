import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { startApplication } from "../../src/app/start-application.js";

describe.sequential("application lifecycle", () => {
  const temporaryDirectories: string[] = [];

  afterAll(async () => {
    await Promise.all(
      temporaryDirectories.map((temporaryDirectory) =>
        rm(temporaryDirectory, { recursive: true, force: true }),
      ),
    );
  });

  it("starts and stops the thread task planner with the application", async () => {
    const workingDirectory =
      await createTemporaryDirectory(temporaryDirectories);
    const application = await startApplication({
      workingDirectory,
      port: 0,
      threadTaskPlanner: {
        intervalMs: 10_000,
      },
    });

    expect(application.threadTaskPlanner).not.toBeNull();
    expect(application.threadTaskPlanner?.isStarted).toBe(true);

    await application.close();

    expect(application.threadTaskPlanner?.isStarted).toBe(false);
  });

  it("keeps planner startup explicitly configurable for tests", async () => {
    const workingDirectory =
      await createTemporaryDirectory(temporaryDirectories);
    const application = await startApplication({
      workingDirectory,
      port: 0,
      threadTaskPlanner: {
        enabled: false,
      },
    });

    expect(application.threadTaskPlanner).toBeNull();

    await application.close();
  });
});

async function createTemporaryDirectory(
  temporaryDirectories: string[],
): Promise<string> {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-application-lifecycle-"),
  );

  temporaryDirectories.push(temporaryDirectory);

  return temporaryDirectory;
}
