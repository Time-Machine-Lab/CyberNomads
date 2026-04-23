export const CYBERNOMADS_TASK_DECOMPOSITION_SKILL =
  "cybernomads-task-decomposition";
export const CYBERNOMADS_TASK_EXECUTION_SKILL = "cybernomads-task-execution";

export const REQUIRED_RUNTIME_SKILL_NAMES = [
  CYBERNOMADS_TASK_DECOMPOSITION_SKILL,
  CYBERNOMADS_TASK_EXECUTION_SKILL,
] as const;

export function renderTaskDecompositionSkillInstruction(): string {
  return [
    `Use $${CYBERNOMADS_TASK_DECOMPOSITION_SKILL} for Cybernomads task decomposition.`,
    `Generate an atomic task set and persist it only through controlled Cybernomads task-set APIs/tools.`,
  ].join("\n");
}

export function renderTaskExecutionSkillInstruction(taskId: string): string {
  return [
    `Use $${CYBERNOMADS_TASK_EXECUTION_SKILL} to execute Cybernomads task "${taskId}".`,
    `Stay scoped to this task, create output records for produced data, and update status only through controlled Cybernomads APIs/tools.`,
  ].join("\n");
}
