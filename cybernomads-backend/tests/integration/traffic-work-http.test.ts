import { access, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";
import type {
  AgentProviderConnectionCheckResult,
  AgentProviderContext,
  AgentProviderPort,
  AgentProviderSendMessageInput,
  AgentProviderSubmitMessageResult,
  AgentProviderSendMessageResult,
  AgentProviderSession,
  AgentProviderSessionCreateInput,
  AgentProviderSessionHistoryInput,
  AgentProviderSubagentInvocationInput,
  AgentProviderSubagentInvocationResult,
} from "../../src/ports/agent-provider-port.js";
import type { AgentConversationMessage } from "../../src/modules/agent-access/types.js";

describe.sequential("traffic work module http api", () => {
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

  it("creates, lists, reads, and applies lifecycle operations for traffic works", async () => {
    const planningProvider = new FakeAgentProvider("cybernomads-agent", [
      JSON.stringify(createTaskPlanDraft("collect-1", "Collect candidates 1")),
      JSON.stringify(createPassingReview("Initial draft is reviewable.")),
      JSON.stringify(
        createTaskPlanDraft(
          "collect-feedback",
          "Collect candidates after feedback",
          {
            feedbackConsideration:
              "User asked to prioritize creator candidates with verified profile data.",
          },
        ),
      ),
      JSON.stringify(
        createPassingReview("Feedback-based draft is reviewable."),
      ),
      JSON.stringify(createTaskPlanDraft("collect-2", "Collect candidates 2")),
      JSON.stringify(createPassingReview("Replacement draft is reviewable.")),
    ]);
    const executionProvider = new FakeAgentProvider("openclaw");
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      [planningProvider, executionProvider],
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    await configureConnectedAgentServices(application);

    const productId = await createProduct(application, "CyberNomads Product");
    await seedStrategy(
      runtimePaths.databaseFile,
      runtimePaths.strategyDirectory,
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
    );
    await seedStrategy(
      runtimePaths.databaseFile,
      runtimePaths.strategyDirectory,
      {
        strategyId: "strategy-2",
        name: "Retention Strategy",
      },
    );

    const createResponse = await fetch(
      `${application.http.url}/api/traffic-works`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Main Growth Work",
          productId,
          strategyId: "strategy-1",
          objectBindings: [
            {
              objectType: "account",
              objectKey: "primary-account",
              resourceId: "account-1",
              resourceLabel: "Main Account",
            },
            {
              objectType: "产品",
              objectKey: "product_name",
              resourceId: "CyberNomads",
              resourceLabel: "CyberNomads",
            },
            {
              objectType: "账号",
              objectKey: "max_retry",
              resourceId: "3",
              resourceLabel: "3",
            },
          ],
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      trafficWorkId: string;
      displayName: string;
      product: { productId: string; name: string };
      strategy: { strategyId: string; name: string };
      objectBindings: Array<Record<string, unknown>>;
      lifecycleStatus: string;
      contextPreparationStatus: string;
      contextPreparationStatusReason: string | null;
    };

    expect(created.displayName).toBe("Main Growth Work");
    expect(created.product.productId).toBe(productId);
    expect(created.strategy).toEqual({
      strategyId: "strategy-1",
      name: "Growth Strategy",
    });
    expect(created.objectBindings).toEqual([
      {
        objectType: "account",
        objectKey: "primary-account",
        resourceId: "account-1",
        resourceLabel: "Main Account",
      },
      {
        objectType: "产品",
        objectKey: "product_name",
        resourceId: "CyberNomads",
        resourceLabel: "CyberNomads",
      },
      {
        objectType: "账号",
        objectKey: "max_retry",
        resourceId: "3",
        resourceLabel: "3",
      },
    ]);
    expect(created.lifecycleStatus).toBe("ready");
    expect(created.contextPreparationStatus).toBe("pending");
    expect(created.contextPreparationStatusReason).toContain(
      "Cybernomads Agent task decomposition is waiting for user confirmation.",
    );
    expect(planningProvider.sentMessages).toHaveLength(2);
    expect(planningProvider.sentMessages[0]?.message).toContain(
      "Cybernomads Task Planner",
    );
    expect(planningProvider.sentMessages[1]?.message).toContain(
      "Cybernomads Review Agent",
    );
    expect(planningProvider.createdSessions[0]?.context).toContain(
      "product_name",
    );
    expect(executionProvider.sentMessages).toHaveLength(0);

    const createdTasksResponse = await fetch(
      `${application.http.url}/api/tasks?trafficWorkId=${created.trafficWorkId}`,
    );
    expect(createdTasksResponse.status).toBe(200);
    await expect(createdTasksResponse.json()).resolves.toEqual({
      items: [],
    });

    const workDirectory = join(
      runtimePaths.workDirectory,
      created.trafficWorkId,
    );
    await expect(
      access(join(workDirectory, "skills")),
    ).resolves.toBeUndefined();
    await expect(access(join(workDirectory, "tools"))).resolves.toBeUndefined();
    await expect(
      access(join(workDirectory, "knowledge")),
    ).resolves.toBeUndefined();
    await expect(access(join(workDirectory, "data"))).resolves.toBeUndefined();
    await expect(access(join(workDirectory, "task.md"))).rejects.toBeDefined();
    await expect(
      access(join(workDirectory, "collect-1.md")),
    ).rejects.toBeDefined();

    const runDetailResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run`,
    );
    expect(runDetailResponse.status).toBe(200);
    await expect(runDetailResponse.json()).resolves.toMatchObject({
      status: "waiting_user_confirmation",
      stage: "waiting_user_confirmation",
      providerCode: "cybernomads-agent",
      model: "gpt-5.5",
      reviewConclusion: "pass",
      requiresUserConfirmation: true,
      artifacts: expect.arrayContaining([
        expect.objectContaining({ artifactType: "task_plan_draft" }),
        expect.objectContaining({ artifactType: "review_report" }),
        expect.objectContaining({ artifactType: "decomposition_report" }),
      ]),
    });

    const centerViewResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run/center-view`,
    );
    expect(centerViewResponse.status).toBe(200);
    const centerView = (await centerViewResponse.json()) as Record<
      string,
      unknown
    >;
    expect(centerView).toMatchObject({
      status: "waiting_user_confirmation",
      stage: "waiting_user_confirmation",
      progress: {
        percent: 90,
        label: "Waiting for confirmation",
      },
      draftGraph: {
        sourceArtifactType: "task_plan_draft",
        nodes: [
          expect.objectContaining({
            taskKey: "collect-1",
            name: "Collect candidates 1",
          }),
        ],
        edges: [],
      },
      review: {
        conclusion: "pass",
        issuesBySeverity: {
          info: [],
          warning: [],
          error: [],
        },
      },
      availableActions: {
        confirmPlan: true,
        submitFeedback: true,
        enterExecution: false,
        inspectFailure: false,
      },
    });
    expect(JSON.stringify(centerView)).toContain("Collect candidates 1");
    expect(JSON.stringify(centerView)).not.toContain("planning-secret");
    expect(JSON.stringify(centerView)).not.toContain("inputPrompt");
    expect(JSON.stringify(centerView)).not.toContain("Authorization");

    const reportResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run/report`,
    );
    expect(reportResponse.status).toBe(200);
    await expect(reportResponse.json()).resolves.toMatchObject({
      trafficWorkId: created.trafficWorkId,
      markdown: expect.stringContaining("Collect candidates 1"),
    });

    const blockedStartResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/start`,
      { method: "POST" },
    );
    expect(blockedStartResponse.status).toBe(409);

    const feedbackResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run/feedback`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          feedback:
            "Prioritize creator candidates with verified profile data before collection.",
        }),
      },
    );
    expect(feedbackResponse.status).toBe(202);
    await expect(feedbackResponse.json()).resolves.toMatchObject({
      status: "waiting_user_confirmation",
      stage: "waiting_user_confirmation",
      reviewConclusion: "pass",
      requiresUserConfirmation: true,
    });
    expect(planningProvider.sentMessages).toHaveLength(4);
    expect(planningProvider.sentMessages[2]?.message).toContain(
      "Prioritize creator candidates with verified profile data before collection.",
    );
    expect(planningProvider.sentMessages[2]?.message).toContain(
      "Initial draft is reviewable.",
    );

    const confirmResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run/confirmation`,
      { method: "POST" },
    );
    expect(confirmResponse.status).toBe(200);
    await expect(confirmResponse.json()).resolves.toMatchObject({
      status: "committed",
      stage: "prepared",
      requiresUserConfirmation: false,
    });

    const preparedCenterViewResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run/center-view`,
    );
    expect(preparedCenterViewResponse.status).toBe(200);
    await expect(preparedCenterViewResponse.json()).resolves.toMatchObject({
      status: "committed",
      stage: "prepared",
      progress: {
        percent: 100,
        label: "Prepared",
      },
      draftGraph: {
        sourceArtifactType: "confirmation_snapshot",
        nodes: [
          expect.objectContaining({
            taskKey: "collect-feedback",
            name: "Collect candidates after feedback",
          }),
        ],
      },
      availableActions: {
        confirmPlan: false,
        submitFeedback: false,
        enterExecution: true,
        inspectFailure: false,
      },
    });

    const createdTasksAfterPreparationResponse = await fetch(
      `${application.http.url}/api/tasks?trafficWorkId=${created.trafficWorkId}`,
    );
    expect(createdTasksAfterPreparationResponse.status).toBe(200);
    await expect(
      createdTasksAfterPreparationResponse.json(),
    ).resolves.toMatchObject({
      items: [
        {
          trafficWorkId: created.trafficWorkId,
          name: "Collect candidates after feedback",
          status: "ready",
        },
      ],
    });
    await expect(
      readFile(join(workDirectory, "collect-feedback.md"), "utf8"),
    ).resolves.toContain("Collect candidates after feedback");

    const listResponse = await fetch(
      `${application.http.url}/api/traffic-works`,
    );
    expect(listResponse.status).toBe(200);
    const listPayload = (await listResponse.json()) as {
      items: Array<Record<string, unknown>>;
    };
    expect(listPayload.items).toHaveLength(1);
    expect(listPayload.items[0]).toMatchObject({
      trafficWorkId: created.trafficWorkId,
      displayName: "Main Growth Work",
      lifecycleStatus: "ready",
      contextPreparationStatus: "prepared",
      objectBindingCount: 3,
    });

    const detailResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}`,
    );
    expect(detailResponse.status).toBe(200);
    await expect(detailResponse.json()).resolves.toMatchObject({
      trafficWorkId: created.trafficWorkId,
      strategy: {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
      contextPreparationStatus: "prepared",
      objectBindings: [
        {
          objectType: "account",
          objectKey: "primary-account",
          resourceId: "account-1",
          resourceLabel: "Main Account",
        },
        {
          objectType: "产品",
          objectKey: "product_name",
          resourceId: "CyberNomads",
          resourceLabel: "CyberNomads",
        },
        {
          objectType: "账号",
          objectKey: "max_retry",
          resourceId: "3",
          resourceLabel: "3",
        },
      ],
    });

    const startResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/start`,
      { method: "POST" },
    );
    expect(startResponse.status).toBe(200);
    await expect(startResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "running",
    });

    const pauseResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/pause`,
      { method: "POST" },
    );
    expect(pauseResponse.status).toBe(200);
    await expect(pauseResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "ready",
      contextPreparationStatus: "prepared",
    });

    const updateResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Main Growth Work v2",
          productId,
          strategyId: "strategy-2",
          objectBindings: [
            {
              objectType: "account",
              objectKey: "primary-account",
              resourceId: "account-2",
              resourceLabel: "Backup Account",
            },
            {
              objectType: "产品",
              objectKey: "product_name",
              resourceId: "CyberNomads v2",
              resourceLabel: "CyberNomads v2",
            },
          ],
        }),
      },
    );
    expect(updateResponse.status).toBe(200);
    await expect(updateResponse.json()).resolves.toMatchObject({
      trafficWorkId: created.trafficWorkId,
      displayName: "Main Growth Work v2",
      lifecycleStatus: "ready",
      strategy: {
        strategyId: "strategy-2",
        name: "Retention Strategy",
      },
      objectBindings: [
        {
          objectType: "account",
          objectKey: "primary-account",
          resourceId: "account-2",
          resourceLabel: "Backup Account",
        },
        {
          objectType: "产品",
          objectKey: "product_name",
          resourceId: "CyberNomads v2",
          resourceLabel: "CyberNomads v2",
        },
      ],
      contextPreparationStatus: "pending",
    });
    expect(planningProvider.sentMessages).toHaveLength(6);
    expect(planningProvider.createdSessions[4]?.context).toContain(
      "CyberNomads v2",
    );

    const confirmReplacementResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/decomposition-run/confirmation`,
      { method: "POST" },
    );
    expect(confirmReplacementResponse.status).toBe(200);
    await expect(confirmReplacementResponse.json()).resolves.toMatchObject({
      status: "committed",
      stage: "prepared",
    });

    const replacedTasksResponse = await fetch(
      `${application.http.url}/api/tasks?trafficWorkId=${created.trafficWorkId}`,
    );
    expect(replacedTasksResponse.status).toBe(200);
    await expect(replacedTasksResponse.json()).resolves.toMatchObject({
      items: [
        {
          trafficWorkId: created.trafficWorkId,
          name: "Collect candidates 2",
          status: "ready",
        },
      ],
    });
    await expect(
      readFile(join(workDirectory, "collect-2.md"), "utf8"),
    ).resolves.toContain("Collect candidates 2");

    const endResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/end`,
      { method: "POST" },
    );
    expect(endResponse.status).toBe(200);
    await expect(endResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "ended",
    });

    const archiveResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/archive`,
      { method: "POST" },
    );
    expect(archiveResponse.status).toBe(200);
    await expect(archiveResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "archived",
    });

    const deleteResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}`,
      { method: "DELETE" },
    );
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "deleted",
    });

    expect(planningProvider.sentMessages).toHaveLength(6);
    expect(executionProvider.sentMessages).toHaveLength(0);
  });

  it("returns a failed preparation state when no current agent service is configured", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      [],
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);
    const productId = await createProduct(application, "CyberNomads Product");
    await seedStrategy(
      runtimePaths.databaseFile,
      runtimePaths.strategyDirectory,
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
    );

    const createResponse = await fetch(
      `${application.http.url}/api/traffic-works`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Preparation Failure Work",
          productId,
          strategyId: "strategy-1",
          objectBindings: [
            {
              objectType: "account",
              objectKey: "primary-account",
              resourceId: "account-1",
              resourceLabel: null,
            },
          ],
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    const created = (await createResponse.json()) as {
      trafficWorkId: string;
      contextPreparationStatus: string;
      contextPreparationStatusReason: string | null;
    };

    expect(created.contextPreparationStatus).toBe("failed");
    expect(created.contextPreparationStatusReason).toContain("not configured");

    const startResponse = await fetch(
      `${application.http.url}/api/traffic-works/${created.trafficWorkId}/start`,
      { method: "POST" },
    );
    expect(startResponse.status).toBe(409);
  });

  it("allows creating a traffic work without object bindings", async () => {
    const planningProvider = new FakeAgentProvider("cybernomads-agent", [
      JSON.stringify(createTaskPlanDraft("collect-1", "Collect candidates 1")),
      JSON.stringify(createPassingReview("Draft is reviewable.")),
    ]);
    const executionProvider = new FakeAgentProvider("openclaw");
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      [planningProvider, executionProvider],
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    await configureConnectedAgentServices(application);

    const productId = await createProduct(application, "CyberNomads Product");
    await seedStrategy(
      runtimePaths.databaseFile,
      runtimePaths.strategyDirectory,
      {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
    );

    const createResponse = await fetch(
      `${application.http.url}/api/traffic-works`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          displayName: "Unbound Work",
          productId,
          strategyId: "strategy-1",
          objectBindings: [
            {
              objectType: "产品",
              objectKey: "product_name",
              resourceId: "CyberNomads",
              resourceLabel: "CyberNomads",
            },
          ],
        }),
      },
    );

    expect(createResponse.status).toBe(201);
    await expect(createResponse.json()).resolves.toMatchObject({
      displayName: "Unbound Work",
      product: {
        productId,
        name: "CyberNomads Product",
      },
      strategy: {
        strategyId: "strategy-1",
        name: "Growth Strategy",
      },
      objectBindings: [
        {
          objectType: "产品",
          objectKey: "product_name",
          resourceId: "CyberNomads",
          resourceLabel: "CyberNomads",
        },
      ],
      contextPreparationStatus: "pending",
    });

    expect(planningProvider.createdSessions[0]?.context).toContain(
      "product_name",
    );
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
  agentProviders: AgentProviderPort[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-traffic-work-module-"),
  );
  temporaryDirectories.push(workingDirectory);

  const application = await startApplication({
    workingDirectory,
    port: 0,
    agentProviders,
  });
  applications.push(application);

  return {
    application,
    workingDirectory,
  };
}

async function configureConnectedAgentServices(
  application: ApplicationReadyState,
): Promise<void> {
  const configurePlanningResponse = await fetch(
    `${application.http.url}/api/agent-services/planning`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerCode: "cybernomads-agent",
        endpointUrl: "http://agent.local:3002",
        model: "gpt-5.5",
        reasoningEffort: "low",
        authentication: {
          kind: "api-key",
          secret: "planning-secret",
        },
      }),
    },
  );
  expect(configurePlanningResponse.status).toBe(201);

  const verifyPlanningResponse = await fetch(
    `${application.http.url}/api/agent-services/planning/connection-verification`,
    { method: "POST" },
  );
  expect(verifyPlanningResponse.status).toBe(200);

  const capabilityPlanningResponse = await fetch(
    `${application.http.url}/api/agent-services/planning/capability-provisioning`,
    { method: "POST" },
  );
  expect(capabilityPlanningResponse.status).toBe(200);

  const configureExecutionResponse = await fetch(
    `${application.http.url}/api/agent-services/execution`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        providerCode: "openclaw",
        endpointUrl: "http://agent.local:3001",
        authentication: {
          kind: "bearer-token",
          secret: "secret-token",
        },
      }),
    },
  );
  expect(configureExecutionResponse.status).toBe(201);

  const verifyExecutionResponse = await fetch(
    `${application.http.url}/api/agent-services/execution/connection-verification`,
    { method: "POST" },
  );
  expect(verifyExecutionResponse.status).toBe(200);

  const capabilityExecutionResponse = await fetch(
    `${application.http.url}/api/agent-services/execution/capability-provisioning`,
    { method: "POST" },
  );
  expect(capabilityExecutionResponse.status).toBe(200);
}

async function createProduct(
  application: ApplicationReadyState,
  name: string,
): Promise<string> {
  const response = await fetch(`${application.http.url}/api/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      contentMarkdown: `# ${name}\n\nRuntime content.`,
    }),
  });
  expect(response.status).toBe(201);

  const payload = (await response.json()) as { productId: string };
  return payload.productId;
}

async function seedStrategy(
  databaseFile: string,
  strategyDirectory: string,
  input: { strategyId: string; name: string },
): Promise<void> {
  const database = new DatabaseSync(databaseFile);
  database
    .prepare(
      `
        INSERT INTO strategies (
          strategy_id,
          name,
          summary,
          tags_json,
          content_ref,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
    )
    .run(
      input.strategyId,
      input.name,
      `${input.name} summary`,
      "[]",
      `${input.strategyId}.md`,
      "2026-04-21T08:00:00.000Z",
      "2026-04-21T08:00:00.000Z",
    );
  database.close();
  await writeFile(
    join(strategyDirectory, `${input.strategyId}.md`),
    `# ${input.name}\n\nStrategy runtime content.`,
    "utf8",
  );
}

function createTaskPlanDraft(
  taskKey: string,
  taskName: string,
  options: { feedbackConsideration?: string } = {},
) {
  return {
    summary: `${taskName} draft is ready.`,
    strategyCoverageSummary: "Covers the selected growth strategy.",
    feedbackConsideration: options.feedbackConsideration ?? null,
    tasks: [
      {
        taskKey,
        name: taskName,
        goal: "Collect candidate traffic targets for the selected strategy.",
        expectedOutputs: [`${taskName} shortlist`],
        inputSources: [
          {
            type: "product_content",
            description: "CyberNomads product content snapshot.",
            acquisition: "Read from the traffic work context markdown.",
            missingBehavior: "blocking",
            sourceTaskKey: null,
          },
          {
            type: "strategy_content",
            description: "Selected strategy content snapshot.",
            acquisition: "Read from the traffic work context markdown.",
            missingBehavior: "blocking",
            sourceTaskKey: null,
          },
        ],
        dependsOn: [],
        resourceNeeds: ["Product snapshot", "Strategy snapshot"],
        strategyCoverage: ["Candidate discovery"],
        skillRefs: ["cybernomads-task-decomposition"],
        instruction: "Collect candidate traffic targets.",
        documentRef: `./${taskKey}.md`,
        contextRef: "./",
        condition: {
          cron: null,
          relyOnTaskKeys: [],
        },
        inputPrompt:
          "Read prepared work context from ./knowledge before executing this task.",
      },
    ],
  };
}

function createPassingReview(summary: string) {
  return {
    conclusion: "pass",
    summary,
    issues: [],
  };
}

class FakeAgentProvider implements AgentProviderPort {
  readonly submittedMessages: AgentProviderSendMessageInput[] = [];
  readonly sentMessages: AgentProviderSendMessageInput[] = [];
  readonly createdSessions: AgentProviderSessionCreateInput[] = [];
  private readonly sessionMessages = new Map<
    string,
    AgentConversationMessage[]
  >();
  private sessionCounter = 0;
  private messageCounter = 0;

  constructor(
    readonly providerCode: string,
    private readonly messageResponses: string[] = [],
  ) {}

  async verifyConnection(
    _context: AgentProviderContext,
  ): Promise<AgentProviderConnectionCheckResult> {
    void _context;
    return {
      isReachable: true,
      reason: "connection ok",
    };
  }

  async prepareCapabilities(
    _context: AgentProviderContext,
  ): Promise<{ isPrepared: boolean; reason: string | null }> {
    void _context;
    return {
      isPrepared: true,
      reason: "capabilities prepared",
    };
  }

  async createSession(
    _context: AgentProviderContext,
    input: AgentProviderSessionCreateInput,
  ): Promise<AgentProviderSession> {
    void _context;
    this.createdSessions.push(structuredClone(input));
    this.sessionCounter += 1;
    const sessionId = `session-${this.sessionCounter}`;
    const messages: AgentConversationMessage[] = [];

    if (input.context) {
      messages.push({
        role: "system",
        content: input.context,
      });
    }

    this.sessionMessages.set(sessionId, messages);

    return { sessionId };
  }

  async sendMessage(
    _context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSendMessageResult> {
    void _context;
    this.messageCounter += 1;
    this.sentMessages.push(structuredClone(input));
    const outputText =
      this.messageResponses.shift() ?? `handled:${input.message}`;

    const messages = this.sessionMessages.get(input.sessionId) ?? [];
    messages.push({
      role: "user",
      content: input.message,
    });
    messages.push({
      role: "assistant",
      content: outputText,
    });
    this.sessionMessages.set(input.sessionId, messages);

    return {
      messageId: `message-${this.messageCounter}`,
      outputText,
    };
  }

  async submitMessage(
    _context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSubmitMessageResult> {
    void _context;
    this.messageCounter += 1;
    this.submittedMessages.push(structuredClone(input));
    const messages = this.sessionMessages.get(input.sessionId) ?? [];
    messages.push({
      role: "user",
      content: input.message,
    });
    this.sessionMessages.set(input.sessionId, messages);

    return {
      messageId: `message-${this.messageCounter}`,
    };
  }

  async listSessionMessages(
    _context: AgentProviderContext,
    input: AgentProviderSessionHistoryInput,
  ): Promise<AgentConversationMessage[]> {
    void _context;
    return [...(this.sessionMessages.get(input.sessionId) ?? [])];
  }

  async invokeSubagent(
    _context: AgentProviderContext,
    input: AgentProviderSubagentInvocationInput,
  ): Promise<AgentProviderSubagentInvocationResult> {
    void _context;
    return {
      invocationId: `subagent:${input.sessionId}`,
      outputText: `subagent:${input.instructions}`,
      status: "completed",
    };
  }
}
