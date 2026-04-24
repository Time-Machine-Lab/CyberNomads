import { randomUUID } from "node:crypto";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it, vi } from "vitest";

import { AgentAccessTrafficWorkContextPreparationAdapter } from "../../src/adapters/agent/traffic-work-context-preparation-adapter.js";
import type { AgentAccessService } from "../../src/modules/agent-access/service.js";
import type { PrepareTrafficWorkContextInput } from "../../src/ports/traffic-work-context-preparation-port.js";

interface TaskDecompositionRequestLike {
  title: string;
  context: string;
  prompt: string;
}

describe("traffic work context preparation adapter", () => {
  const temporaryDirectories: string[] = [];

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
  });

  it("builds the structured task decomposition prompt with runtime root and relative paths", async () => {
    const runtimeRootDirectory = await createTemporaryDirectory(
      "cybernomads-prompt-",
      temporaryDirectories,
    );
    const runtimeSkillsDirectory = join(runtimeRootDirectory, "agent", "skills");
    const workDirectory = join(runtimeRootDirectory, "work", "traffic-work-1");

    await mkdir(
      join(
        runtimeSkillsDirectory,
        "cybernomads-task-decomposition",
      ),
      { recursive: true },
    );
    await mkdir(workDirectory, { recursive: true });
    await writeFile(
      join(
        runtimeSkillsDirectory,
        "cybernomads-task-decomposition",
        "SKILL.md",
      ),
      "# task decomposition skill",
      "utf8",
    );

    const submitTaskDecompositionRequest = vi.fn(
      async (_request: TaskDecompositionRequestLike) => ({
        sessionId: "session-1",
        outputText: "{}",
        history: [],
        taskSet: {
          source: { kind: "agent-decomposition" as const },
          tasks: [],
        },
      }),
    );
    const adapter = new AgentAccessTrafficWorkContextPreparationAdapter({
      agentAccessService: {
        submitTaskDecompositionRequest,
      } as unknown as AgentAccessService,
      runtimeRootDirectory,
      runtimeSkillsDirectory,
    });

    await adapter.prepareContext(createInput(workDirectory));

    expect(submitTaskDecompositionRequest).toHaveBeenCalledTimes(1);
    const request = submitTaskDecompositionRequest.mock.calls[0]?.[0];
    expect(request).toBeDefined();

    if (!request) {
      throw new Error("Expected task decomposition request to be defined.");
    }

    expect(request.context).toContain("Main Growth Work");
    expect(request.prompt).toContain("[引流工作信息]");
    expect(request.prompt).toContain("[产品信息]");
    expect(request.prompt).toContain("[策略信息]");
    expect(request.prompt).toContain("[任务拆分Skill信息]");
    expect(request.prompt).toContain("[基础路径信息]");
    expect(request.prompt).toContain("[规则]");
    expect(request.prompt).toContain("引流工作ID: traffic-work-1");
    expect(request.prompt).toContain("产品ID: product-1");
    expect(request.prompt).toContain("策略ID: strategy-1");
    expect(request.prompt).toContain("# CyberNomads Product");
    expect(request.prompt).toContain("# Growth Strategy");
    expect(request.prompt).toContain(
      `Cybernomads目录绝对路径: ${runtimeRootDirectory}`,
    );
    expect(request.prompt).toContain("引流工作目录: ./work/traffic-work-1");
    expect(request.prompt).toContain(
      "任务拆分Skill位置: ./agent/skills/cybernomads-task-decomposition/SKILL.md",
    );
    expect(request.prompt).toContain(
      "- account:primary-account -> account-1 (Main Account)",
    );
    expect(request.prompt).not.toContain("Work context root:");
    expect(request.prompt).not.toContain(
      'Return a task set with source.kind = "agent-decomposition"',
    );
  });

  it("fails before agent invocation when the Cybernomads root directory is missing", async () => {
    const submitTaskDecompositionRequest = vi.fn();
    const adapter = new AgentAccessTrafficWorkContextPreparationAdapter({
      agentAccessService: {
        submitTaskDecompositionRequest,
      } as unknown as AgentAccessService,
      runtimeRootDirectory: join(tmpdir(), `missing-root-${randomUUID()}`),
      runtimeSkillsDirectory: join(tmpdir(), `missing-skills-${randomUUID()}`),
    });

    await expect(
      adapter.prepareContext(createInput(join(tmpdir(), "work", "traffic-work-1"))),
    ).rejects.toThrow("Missing Cybernomads root directory.");
    expect(submitTaskDecompositionRequest).not.toHaveBeenCalled();
  });

  it("fails before agent invocation when the task decomposition Skill file is missing", async () => {
    const runtimeRootDirectory = await createTemporaryDirectory(
      "cybernomads-missing-skill-",
      temporaryDirectories,
    );
    const runtimeSkillsDirectory = join(runtimeRootDirectory, "agent", "skills");
    const workDirectory = join(runtimeRootDirectory, "work", "traffic-work-1");

    await mkdir(runtimeSkillsDirectory, { recursive: true });
    await mkdir(workDirectory, { recursive: true });

    const submitTaskDecompositionRequest = vi.fn();
    const adapter = new AgentAccessTrafficWorkContextPreparationAdapter({
      agentAccessService: {
        submitTaskDecompositionRequest,
      } as unknown as AgentAccessService,
      runtimeRootDirectory,
      runtimeSkillsDirectory,
    });

    await expect(adapter.prepareContext(createInput(workDirectory))).rejects.toThrow(
      'Failed to locate installed runtime Skill file "cybernomads-task-decomposition".',
    );
    expect(submitTaskDecompositionRequest).not.toHaveBeenCalled();
  });

  it("fails before agent invocation when the traffic work directory is invalid", async () => {
    const runtimeRootDirectory = await createTemporaryDirectory(
      "cybernomads-invalid-work-",
      temporaryDirectories,
    );
    const runtimeSkillsDirectory = join(runtimeRootDirectory, "agent", "skills");

    await mkdir(
      join(
        runtimeSkillsDirectory,
        "cybernomads-task-decomposition",
      ),
      { recursive: true },
    );
    await writeFile(
      join(
        runtimeSkillsDirectory,
        "cybernomads-task-decomposition",
        "SKILL.md",
      ),
      "# task decomposition skill",
      "utf8",
    );

    const invalidWorkDirectory = await createTemporaryDirectory(
      "outside-work-",
      temporaryDirectories,
    );
    const submitTaskDecompositionRequest = vi.fn();
    const adapter = new AgentAccessTrafficWorkContextPreparationAdapter({
      agentAccessService: {
        submitTaskDecompositionRequest,
      } as unknown as AgentAccessService,
      runtimeRootDirectory,
      runtimeSkillsDirectory,
    });

    await expect(
      adapter.prepareContext(createInput(invalidWorkDirectory)),
    ).rejects.toThrow(
      "traffic work directory must stay within the Cybernomads root directory.",
    );
    expect(submitTaskDecompositionRequest).not.toHaveBeenCalled();
  });
});

function createInput(workDirectory: string): PrepareTrafficWorkContextInput {
  return {
    trafficWorkId: "traffic-work-1",
    displayName: "Main Growth Work",
    product: {
      productId: "product-1",
      name: "CyberNomads Product",
    },
    productContentMarkdown: "# CyberNomads Product\n\nProduct content.",
    strategy: {
      strategyId: "strategy-1",
      name: "Growth Strategy",
    },
    strategyContentMarkdown: "# Growth Strategy\n\nStrategy content.",
    objectBindings: [
      {
        objectType: "account",
        objectKey: "primary-account",
        resourceId: "account-1",
        resourceLabel: "Main Account",
      },
    ],
    contextMarkdown: "# Context\n\nMain Growth Work",
    context: {
      workDirectory,
      skillsDirectory: join(workDirectory, "skills"),
      toolsDirectory: join(workDirectory, "tools"),
      knowledgeDirectory: join(workDirectory, "knowledge"),
      dataDirectory: join(workDirectory, "data"),
    },
  };
}

async function createTemporaryDirectory(
  prefix: string,
  temporaryDirectories: string[],
): Promise<string> {
  const directory = join(tmpdir(), `${prefix}${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  temporaryDirectories.push(directory);
  return directory;
}
