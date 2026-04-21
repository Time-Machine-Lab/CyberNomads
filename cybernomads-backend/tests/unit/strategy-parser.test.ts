import { describe, expect, it } from "vitest";

import {
  parseStrategyPlaceholders,
  replaceStrategyPlaceholdersWithDefaults,
} from "../../src/modules/strategies/parser.js";

describe("strategy placeholder parser", () => {
  it("parses supported placeholder types, empty string defaults, and deduplicates identical declarations", () => {
    const placeholders = parseStrategyPlaceholders(`
标题：{{string:title="默认标题"}}
按钮：{{string:cta_text=""}}
重试：{{int:max_retry=3}}
重复标题：{{string:title="默认标题"}}
`);

    expect(placeholders).toEqual([
      {
        type: "string",
        key: "title",
        defaultValue: "默认标题",
      },
      {
        type: "string",
        key: "cta_text",
        defaultValue: "",
      },
      {
        type: "int",
        key: "max_retry",
        defaultValue: 3,
      },
    ]);

    expect(
      replaceStrategyPlaceholdersWithDefaults(
        '标题：{{string:title="默认标题"}}，次数：{{int:max_retry=3}}',
      ),
    ).toBe("标题：默认标题，次数：3");
  });

  it("rejects malformed, unsupported, and conflicting placeholder declarations", () => {
    expect(() =>
      parseStrategyPlaceholders("{{string:title=默认标题}}"),
    ).toThrowError(/quoted default value/);

    expect(() => parseStrategyPlaceholders("{{float:ratio=1.5}}")).toThrowError(
      /Invalid strategy placeholder syntax/,
    );

    expect(() =>
      parseStrategyPlaceholders('{{string:title="A"}} {{int:title=2}}'),
    ).toThrowError(/must keep the same type and defaultValue/);

    expect(() => parseStrategyPlaceholders('{{string:title="A"}')).toThrowError(
      /must be closed/,
    );
  });
});
