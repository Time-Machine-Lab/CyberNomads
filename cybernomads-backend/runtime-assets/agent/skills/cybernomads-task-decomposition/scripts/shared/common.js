import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

export const DEFAULT_BACKEND_URL =
  process.env.CYBERNOMADS_BACKEND_URL?.trim() || "http://127.0.0.1:3000";

export function parseCliArgs(argv) {
  const values = new Map();
  const flags = new Set();
  const positionals = [];

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (!token.startsWith("--")) {
      positionals.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      flags.add(key);
      continue;
    }

    if (values.has(key)) {
      const current = values.get(key);
      values.set(
        key,
        Array.isArray(current) ? [...current, next] : [current, next],
      );
    } else {
      values.set(key, next);
    }

    index += 1;
  }

  return { values, flags, positionals };
}

export function hasFlag(parsedArgs, name) {
  return parsedArgs.flags.has(name);
}

export function readOption(parsedArgs, name, options = {}) {
  const {
    required = false,
    multiple = false,
    defaultValue = undefined,
  } = options;
  const rawValue = parsedArgs.values.get(name);

  if (rawValue === undefined) {
    if (required) {
      throw new Error(`Missing required option "--${name}".`);
    }

    return defaultValue;
  }

  if (multiple) {
    return Array.isArray(rawValue) ? rawValue : [rawValue];
  }

  if (Array.isArray(rawValue)) {
    return rawValue.at(-1);
  }

  return rawValue;
}

export async function readJsonFile(path) {
  const filePath = resolve(path);
  const source = await readFile(filePath, "utf8");

  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Failed to parse JSON file "${filePath}".`, {
      cause: error,
    });
  }
}

export async function writeJsonOutput(value, outputPath) {
  const text = `${JSON.stringify(value, null, 2)}\n`;

  if (outputPath) {
    const absoluteOutputPath = resolve(outputPath);
    await mkdir(dirname(absoluteOutputPath), { recursive: true });
    await writeFile(absoluteOutputPath, text, "utf8");
  }

  process.stdout.write(text);
}

export function normalizeBackendUrl(value) {
  const candidate = (value ?? DEFAULT_BACKEND_URL).trim();
  return new URL(candidate).toString().replace(/\/$/, "");
}

export async function requestJson({
  backendUrl,
  pathname,
  method = "GET",
  body,
}) {
  const endpoint = new URL(pathname, `${normalizeBackendUrl(backendUrl)}/`);
  const response = await fetch(endpoint, {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  const payload = text.trim().length === 0 ? {} : JSON.parse(text);

  if (!response.ok) {
    const message = formatRequestErrorMessage(response.status, payload);
    throw new Error(message, {
      cause: payload,
    });
  }

  return payload;
}

function formatRequestErrorMessage(status, payload) {
  if (!payload || typeof payload !== "object") {
    return `Request failed with status ${status}.`;
  }

  const baseMessage =
    typeof payload.message === "string"
      ? payload.message
      : `Request failed with status ${status}.`;
  const issues = Array.isArray(payload.details?.issues)
    ? payload.details.issues
        .filter(
          (issue) =>
            issue &&
            typeof issue === "object" &&
            typeof issue.path === "string" &&
            typeof issue.message === "string",
        )
        .map((issue) => `${issue.path}: ${issue.message}`)
    : [];

  if (issues.length === 0) {
    return baseMessage;
  }

  return `${baseMessage} Details: ${issues.join("; ")}`;
}

export function failWithHelp(message, helpText) {
  if (message) {
    process.stderr.write(`${message}\n\n`);
  }

  process.stdout.write(helpText);
  process.exitCode = message ? 1 : 0;
}
