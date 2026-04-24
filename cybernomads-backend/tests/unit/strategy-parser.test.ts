import { describe, expect, it } from "vitest";

import {
  parseStrategyPlaceholders,
  replaceStrategyPlaceholdersWithDefaults,
} from "../../src/modules/strategies/parser.js";

describe("strategy placeholder parser", () => {
  it("parses arbitrary placeholder types, supports Chinese segments, and deduplicates identical declarations", () => {
    const placeholders = parseStrategyPlaceholders(`
产品：{{产品:产品名="CyberNomads"}}
账号：{{账号:账号A="123456"}}
风控时间：{{风控时间:等待时长="5秒"}}
重复账号：{{账号:账号A="123456"}}
`);

    expect(placeholders).toEqual([
      {
        type: "产品",
        key: "产品名",
        defaultValue: "CyberNomads",
      },
      {
        type: "账号",
        key: "账号A",
        defaultValue: "123456",
      },
      {
        type: "风控时间",
        key: "等待时长",
        defaultValue: "5秒",
      },
    ]);

    expect(
      replaceStrategyPlaceholdersWithDefaults(
        '产品：{{产品:产品名="CyberNomads"}}，账号：{{账号:账号A="123456"}}',
      ),
    ).toBe("产品：CyberNomads，账号：123456");
  });

  it("rejects malformed, unsupported, and conflicting placeholder declarations", () => {
    expect(() =>
      parseStrategyPlaceholders("{{账号:账号A=默认标题}}"),
    ).toThrowError(/quoted string default value/);

    expect(() => parseStrategyPlaceholders("{{float:ratio=1.5}}")).toThrowError(
      /quoted string default value/,
    );

    expect(() =>
      parseStrategyPlaceholders('{{账号:账号A="A"}} {{账号:账号A="B"}}'),
    ).toThrowError(/must keep the same defaultValue/);

    expect(() => parseStrategyPlaceholders('{{账号:账号A="A"}')).toThrowError(
      /must be closed/,
    );
  });
});
