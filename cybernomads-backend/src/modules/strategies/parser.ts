import { StrategyValidationError } from "./errors.js";
import type { StrategyPlaceholder } from "./types.js";

interface StrategyPlaceholderMatch {
  start: number;
  end: number;
  raw: string;
  placeholder: StrategyPlaceholder;
}

export function parseStrategyPlaceholders(
  contentMarkdown: string,
): StrategyPlaceholder[] {
  const matches = scanStrategyPlaceholderMatches(contentMarkdown);
  const deduplicatedPlaceholders = new Map<string, StrategyPlaceholder>();

  for (const match of matches) {
    const identity = buildPlaceholderIdentity(match.placeholder);
    const existingPlaceholder = deduplicatedPlaceholders.get(identity);

    if (
      existingPlaceholder &&
      (existingPlaceholder.type !== match.placeholder.type ||
        existingPlaceholder.defaultValue !== match.placeholder.defaultValue)
    ) {
      throw new StrategyValidationError(
        `Strategy placeholder "${match.placeholder.type}:${match.placeholder.key}" must keep the same defaultValue within one strategy.`,
      );
    }

    if (!existingPlaceholder) {
      deduplicatedPlaceholders.set(identity, match.placeholder);
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
  const separatorIndex = normalizedToken.indexOf(":");
  const assignmentIndex = normalizedToken.indexOf("=", separatorIndex + 1);

  if (
    separatorIndex <= 0 ||
    assignmentIndex <= separatorIndex + 1 ||
    assignmentIndex >= normalizedToken.length - 1
  ) {
    throw new StrategyValidationError(
      `Invalid strategy placeholder syntax: ${raw}`,
    );
  }

  const placeholderType = normalizedToken.slice(0, separatorIndex).trim();
  const key = normalizedToken.slice(separatorIndex + 1, assignmentIndex).trim();
  const rawDefaultValue = normalizedToken.slice(assignmentIndex + 1).trim();

  if (!isValidPlaceholderSegment(placeholderType)) {
    throw new StrategyValidationError(
      `Strategy placeholder type is invalid: ${raw}`,
    );
  }

  if (!isValidPlaceholderSegment(key)) {
    throw new StrategyValidationError(
      `Strategy placeholder name is invalid: ${raw}`,
    );
  }

  return {
    type: placeholderType,
    key,
    defaultValue: parseStrategyPlaceholderDefaultValue(rawDefaultValue, raw),
  };
}

function parseStrategyPlaceholderDefaultValue(
  rawDefaultValue: string,
  raw: string,
): string {
  try {
    const parsedDefaultValue = JSON.parse(rawDefaultValue) as unknown;

    if (typeof parsedDefaultValue !== "string") {
      throw new Error("not string");
    }

    return parsedDefaultValue;
  } catch {
    if (/^-?\d+$/.test(rawDefaultValue)) {
      return rawDefaultValue;
    }

    throw new StrategyValidationError(
      `Strategy placeholder must use a quoted string default value: ${raw}`,
    );
  }
}

function isValidPlaceholderSegment(value: string): boolean {
  return (
    value.length > 0 &&
    !/[\s{}=:"']/.test(value)
  );
}

function buildPlaceholderIdentity(placeholder: StrategyPlaceholder): string {
  return `${placeholder.type}:${placeholder.key}`;
}
