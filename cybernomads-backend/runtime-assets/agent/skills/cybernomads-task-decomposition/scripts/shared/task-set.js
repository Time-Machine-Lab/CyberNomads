import { isAbsolute } from "node:path";

export function validateTaskSet(taskSet) {
  const issues = [];

  if (!taskSet || typeof taskSet !== "object" || Array.isArray(taskSet)) {
    return [{ path: "$", message: "Task set must be an object." }];
  }

  if (!taskSet.source || typeof taskSet.source !== "object") {
    issues.push({
      path: "source",
      message: "Task set source is required.",
    });
  } else if (taskSet.source.kind !== "agent-decomposition") {
    issues.push({
      path: "source.kind",
      message: 'Task set source kind must be "agent-decomposition".',
    });
  }

  if (!Array.isArray(taskSet.tasks) || taskSet.tasks.length === 0) {
    issues.push({
      path: "tasks",
      message: "Task set must include at least one task.",
    });
    return issues;
  }

  const taskKeys = new Set();
  const documentRefs = new Set();

  for (const [index, task] of taskSet.tasks.entries()) {
    const prefix = `tasks[${index}]`;

    if (!task || typeof task !== "object" || Array.isArray(task)) {
      issues.push({
        path: prefix,
        message: "Each task must be an object.",
      });
      continue;
    }

    const taskKey = requireNonEmptyString(task.taskKey, `${prefix}.taskKey`, issues);
    const name = requireNonEmptyString(task.name, `${prefix}.name`, issues);
    const instruction = requireNonEmptyString(
      task.instruction,
      `${prefix}.instruction`,
      issues,
    );
    const contextRef = requireNonEmptyString(task.contextRef, `${prefix}.contextRef`, issues);

    if (taskKey && taskKeys.has(taskKey)) {
      issues.push({
        path: `${prefix}.taskKey`,
        message: `Task key "${taskKey}" is duplicated.`,
      });
    }

    if (taskKey) {
      taskKeys.add(taskKey);
    }

    if (task.documentRef !== undefined && task.documentRef !== null) {
      const documentRef = requireNonEmptyString(
        task.documentRef,
        `${prefix}.documentRef`,
        issues,
      );

      if (documentRef) {
        if (!documentRef.endsWith(".md")) {
          issues.push({
            path: `${prefix}.documentRef`,
            message: "Task documentRef must end with .md.",
          });
        }

        if (isAbsolute(documentRef) || documentRef.includes("..")) {
          issues.push({
            path: `${prefix}.documentRef`,
            message: "Task documentRef must stay within the work directory.",
          });
        }

        if (documentRefs.has(documentRef)) {
          issues.push({
            path: `${prefix}.documentRef`,
            message: `Task documentRef "${documentRef}" is duplicated.`,
          });
        }

        documentRefs.add(documentRef);
      }
    }

    if (contextRef && (isAbsolute(contextRef) || contextRef.includes(".."))) {
      issues.push({
        path: `${prefix}.contextRef`,
        message: "Task contextRef must stay within the work context boundary.",
      });
    }

    validateCondition(task.condition, `${prefix}.condition`, issues);
    validateInputNeeds(task.inputNeeds, `${prefix}.inputNeeds`, issues);

    if (name && instruction && taskKey && contextRef) {
      continue;
    }
  }

  for (const [index, task] of taskSet.tasks.entries()) {
    if (!task?.condition || !Array.isArray(task.condition.relyOnTaskKeys)) {
      continue;
    }

    for (const [dependencyIndex, dependencyKey] of task.condition.relyOnTaskKeys.entries()) {
      if (typeof dependencyKey !== "string" || !taskKeys.has(dependencyKey.trim())) {
        issues.push({
          path: `tasks[${index}].condition.relyOnTaskKeys[${dependencyIndex}]`,
          message: `Task dependency "${dependencyKey}" does not exist in the task set.`,
        });
      }
    }
  }

  return issues;
}

function validateCondition(condition, path, issues) {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    issues.push({
      path,
      message: "Task condition must be an object.",
    });
    return;
  }

  if (
    condition.cron !== null &&
    condition.cron !== undefined &&
    typeof condition.cron !== "string"
  ) {
    issues.push({
      path: `${path}.cron`,
      message: "Task condition cron must be a string or null.",
    });
  }

  if (!Array.isArray(condition.relyOnTaskKeys)) {
    issues.push({
      path: `${path}.relyOnTaskKeys`,
      message: "Task condition relyOnTaskKeys must be an array.",
    });
    return;
  }

  const seen = new Set();

  for (const [index, value] of condition.relyOnTaskKeys.entries()) {
    const dependencyKey = requireNonEmptyString(
      value,
      `${path}.relyOnTaskKeys[${index}]`,
      issues,
    );

    if (dependencyKey && seen.has(dependencyKey)) {
      issues.push({
        path: `${path}.relyOnTaskKeys[${index}]`,
        message: `Task dependency "${dependencyKey}" is duplicated.`,
      });
    }

    if (dependencyKey) {
      seen.add(dependencyKey);
    }
  }
}

function validateInputNeeds(inputNeeds, path, issues) {
  if (!Array.isArray(inputNeeds)) {
    issues.push({
      path,
      message: "Task inputNeeds must be an array.",
    });
    return;
  }

  for (const [index, item] of inputNeeds.entries()) {
    const itemPath = `${path}[${index}]`;

    if (!item || typeof item !== "object" || Array.isArray(item)) {
      issues.push({
        path: itemPath,
        message: "Each task input need must be an object.",
      });
      continue;
    }

    requireNonEmptyString(item.name, `${itemPath}.name`, issues);
    requireNonEmptyString(item.description, `${itemPath}.description`, issues);
    requireNonEmptyString(item.source, `${itemPath}.source`, issues);
  }
}

function requireNonEmptyString(value, path, issues) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push({
      path,
      message: "Expected a non-empty string.",
    });
    return null;
  }

  return value.trim();
}
