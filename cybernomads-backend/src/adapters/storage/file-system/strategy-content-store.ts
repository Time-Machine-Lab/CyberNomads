import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { StrategyContentStore } from "../../../modules/strategies/types.js";

export class FileSystemStrategyContentStore implements StrategyContentStore {
  constructor(private readonly strategyDirectory: string) {}

  async writeContent(
    contentRef: string,
    contentMarkdown: string,
  ): Promise<void> {
    await writeFile(
      resolveContentPath(this.strategyDirectory, contentRef),
      contentMarkdown,
      "utf8",
    );
  }

  async readContent(contentRef: string): Promise<string> {
    return readFile(
      resolveContentPath(this.strategyDirectory, contentRef),
      "utf8",
    );
  }

  async deleteContent(contentRef: string): Promise<void> {
    await rm(resolveContentPath(this.strategyDirectory, contentRef), {
      force: true,
    });
  }
}

function resolveContentPath(
  strategyDirectory: string,
  contentRef: string,
): string {
  return join(strategyDirectory, contentRef);
}
