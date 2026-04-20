import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { ProductContentStore } from "../../../modules/products/types.js";

export class FileSystemProductContentStore implements ProductContentStore {
  constructor(private readonly productDirectory: string) {}

  async writeContent(
    contentRef: string,
    contentMarkdown: string,
  ): Promise<void> {
    await writeFile(
      resolveContentPath(this.productDirectory, contentRef),
      contentMarkdown,
      "utf8",
    );
  }

  async readContent(contentRef: string): Promise<string> {
    return readFile(
      resolveContentPath(this.productDirectory, contentRef),
      "utf8",
    );
  }

  async deleteContent(contentRef: string): Promise<void> {
    await rm(resolveContentPath(this.productDirectory, contentRef), {
      force: true,
    });
  }
}

function resolveContentPath(
  productDirectory: string,
  contentRef: string,
): string {
  return join(productDirectory, contentRef);
}
