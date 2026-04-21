import { StrategyValidationError } from "./errors.js";
import type { StrategyPlaceholder } from "./types.js";

interface StrategyPlaceholderMatch {
  start: number;
  end: number;
  raw: string;
  placeholder: StrategyPlaceholder;
}

const STRATEGY_PLACEHOLDER_PATTERN =
  /^(string|int)\s*:\s*([A-Za-z][A-Za-z0-9_.-]*)\s*=\s*([\s\S]+)$/;

export function parseStrategyPlaceholders(
  contentMarkdown: string,
): StrategyPlaceholder[] {
  const matches = scanStrategyPlaceholderMatches(contentMarkdown);
  const deduplicatedPlaceholders = new Map<string, StrategyPlaceholder>();

  for (const match of matches) {
    const existingPlaceholder = deduplicatedPlaceholders.get(
      match.placeholder.key,
    );

    if (
      existingPlaceholder &&
      (existingPlaceholder.type !== match.placeholder.type ||
        existingPlaceholder.defaultValue !== match.placeholder.defaultValue)
    ) {
      throw new StrategyValidationError(
        `Strategy placeholder "${match.placeholder.key}" must keep the same type and defaultValue within one strategy.`,
      );
    }

    if (!existingPlaceholder) {
      deduplicatedPlaceholders.set(match.placeholder.key, match.placeholder);
    }
  }

  return [...deduplicatedPlaceholders.values()];
}

export function replaceStrategyPlaceholdersWithDefaults(
  contentMarkdown: string,
): string {
  const matches = scanStrategyPlaceholderMatches(contentMarkdown);

  if (matches.length === 0) {
    return contentMarkdown;
  }

  let cursor = 0;
  let renderedContent = "";

  for (const match of matches) {
    renderedContent += contentMarkdown.slice(cursor, match.start);
    renderedContent += String(match.placeholder.defaultValue);
    cursor = match.end;
  }

  renderedContent += contentMarkdown.slice(cursor);
  return renderedContent;
}

function scanStrategyPlaceholderMatches(
  contentMarkdown: string,
): StrategyPlaceholderMatch[] {
  const matches: StrategyPlaceholderMatch[] = [];
  let cursor = 0;

  while (cursor < contentMarkdown.length) {
    const start = contentMarkdown.indexOf("{{", cursor);

    if (start === -1) {
      break;
    }

    const endDelimiter = contentMarkdown.indexOf("}}", start + 2);

    if (endDelimiter === -1) {
      throw new StrategyValidationError(
        'Strategy placeholder must be closed with "}}".',
      );
    }

    const raw = contentMarkdown.slice(start, endDelimiter + 2);
    const token = contentMarkdown.slice(start + 2, endDelimiter);

    if (token.includes("{{") || token.includes("}}")) {
      throw new StrategyValidationError(
        "Nested strategy placeholder syntax is not supported.",
      );
    }

    matches.push({
      start,
      end: endDelimiter + 2,
      raw,
      placeholder: parseStrategyPlaceholderToken(token, raw),
    });

    cursor = endDelimiter + 2;
  }

  return matches;
}

function parseStrategyPlaceholderToken(
  token: string,
  raw: string,
): StrategyPlaceholder {
  const normalizedToken = token.trim();
  const match = STRATEGY_PLACEHOLDER_PATTERN.exec(normalizedToken);

  if (!match) {
    throw new StrategyValidationError(
      `Invalid strategy placeholder syntax: ${raw}`,
    );
  }

  const [, placeholderType, key, rawDefaultValue] = match;

  if (placeholderType === "string") {
    const normalizedDefaultValue = rawDefaultValue.trim();

    try {
      const parsedDefaultValue = JSON.parse(normalizedDefaultValue) as unknown;

      if (typeof parsedDefaultValue !== "string") {
        throw new Error("not string");
      }

      return {
        type: "string",
        key,
        defaultValue: parsedDefaultValue,
      };
    } catch {
      throw new StrategyValidationError(
        `String strategy placeholder must use a quoted default value: ${raw}`,
      );
    }
  }

  const normalizedDefaultValue = rawDefaultValue.trim();

  if (!/^-?\d+$/.test(normalizedDefaultValue)) {
    throw new StrategyValidationError(
      `Int strategy placeholder must use an integer default value: ${raw}`,
    );
  }

  const parsedDefaultValue = Number.parseInt(normalizedDefaultValue, 10);

  if (!Number.isSafeInteger(parsedDefaultValue)) {
    throw new StrategyValidationError(
      `Int strategy placeholder must use a safe integer default value: ${raw}`,
    );
  }

  return {
    type: "int",
    key,
    defaultValue: parsedDefaultValue,
  };
}
