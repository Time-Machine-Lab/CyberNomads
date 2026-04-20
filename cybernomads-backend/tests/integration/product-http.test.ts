import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";

describe.sequential("product module http api", () => {
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

  it("creates, lists, updates, and reads product details with persisted markdown content", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const createResponse = await fetch(`${application.http.url}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "CyberNomads",
        contentMarkdown: "# CyberNomads\n\nMVP growth operating system.",
      }),
    });

    expect(createResponse.status).toBe(201);

    const createdProduct = (await createResponse.json()) as {
      productId: string;
      name: string;
      contentMarkdown: string;
      createdAt: string;
      updatedAt: string;
    };

    expect(createdProduct.name).toBe("CyberNomads");
    expect(createdProduct.contentMarkdown).toContain("MVP growth");
    expect(createdProduct.createdAt).toBe(createdProduct.updatedAt);

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const databaseRow = database
      .prepare(
        `
          SELECT content_ref AS contentRef
          FROM products
          WHERE product_id = ?
        `,
      )
      .get(createdProduct.productId) as { contentRef: string } | undefined;
    database.close();

    expect(databaseRow?.contentRef).toBe(`${createdProduct.productId}.md`);

    const contentPath = join(
      runtimePaths.productDirectory,
      databaseRow!.contentRef,
    );
    await expect(access(contentPath)).resolves.toBeUndefined();
    await expect(readFile(contentPath, "utf8")).resolves.toBe(
      createdProduct.contentMarkdown,
    );

    const listResponse = await fetch(`${application.http.url}/api/products`);
    expect(listResponse.status).toBe(200);

    const listPayload = (await listResponse.json()) as {
      items: Array<Record<string, unknown>>;
    };

    expect(listPayload.items).toHaveLength(1);
    expect(listPayload.items[0]).toEqual({
      productId: createdProduct.productId,
      name: "CyberNomads",
      updatedAt: createdProduct.updatedAt,
    });
    expect(listPayload.items[0]).not.toHaveProperty("contentMarkdown");

    const detailResponse = await fetch(
      `${application.http.url}/api/products/${createdProduct.productId}`,
    );
    expect(detailResponse.status).toBe(200);

    const detailPayload = (await detailResponse.json()) as {
      productId: string;
      name: string;
      contentMarkdown: string;
      createdAt: string;
      updatedAt: string;
    };

    expect(detailPayload).toEqual(createdProduct);

    const updateResponse = await fetch(
      `${application.http.url}/api/products/${createdProduct.productId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "CyberNomads Updated",
          contentMarkdown: "# CyberNomads Updated\n\nLatest context.",
        }),
      },
    );

    expect(updateResponse.status).toBe(200);

    const updatedProduct = (await updateResponse.json()) as {
      productId: string;
      name: string;
      contentMarkdown: string;
      createdAt: string;
      updatedAt: string;
    };

    expect(updatedProduct.productId).toBe(createdProduct.productId);
    expect(updatedProduct.name).toBe("CyberNomads Updated");
    expect(updatedProduct.contentMarkdown).toContain("Latest context.");
    expect(updatedProduct.createdAt).toBe(createdProduct.createdAt);
    expect(updatedProduct.updatedAt).not.toBe(createdProduct.updatedAt);

    await expect(readFile(contentPath, "utf8")).resolves.toBe(
      updatedProduct.contentMarkdown,
    );

    const updatedListResponse = await fetch(
      `${application.http.url}/api/products`,
    );
    const updatedListPayload = (await updatedListResponse.json()) as {
      items: Array<Record<string, unknown>>;
    };
    expect(updatedListPayload.items[0]).toEqual({
      productId: createdProduct.productId,
      name: "CyberNomads Updated",
      updatedAt: updatedProduct.updatedAt,
    });

    const updatedDetailResponse = await fetch(
      `${application.http.url}/api/products/${createdProduct.productId}`,
    );
    const updatedDetailPayload = (await updatedDetailResponse.json()) as {
      productId: string;
      name: string;
      contentMarkdown: string;
      createdAt: string;
      updatedAt: string;
    };
    expect(updatedDetailPayload).toEqual(updatedProduct);
  });

  it("does not expose product deletion, status machines, or version fields in mvp", async () => {
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );

    const createResponse = await fetch(`${application.http.url}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "No Delete Product",
        contentMarkdown: "# No Delete\n\nStill MVP.",
      }),
    });
    const createdProduct = (await createResponse.json()) as {
      productId: string;
    };

    const deleteResponse = await fetch(
      `${application.http.url}/api/products/${createdProduct.productId}`,
      {
        method: "DELETE",
      },
    );

    expect(deleteResponse.status).toBe(405);
    expect(deleteResponse.headers.get("allow")).toBe("GET, PUT");

    const detailResponse = await fetch(
      `${application.http.url}/api/products/${createdProduct.productId}`,
    );
    const detailPayload = (await detailResponse.json()) as Record<
      string,
      unknown
    >;

    expect(detailPayload).not.toHaveProperty("status");
    expect(detailPayload).not.toHaveProperty("version");
    expect(detailPayload).not.toHaveProperty("deletedAt");
    expect(detailPayload).not.toHaveProperty("publishedAt");
    expect(detailPayload).not.toHaveProperty("archivedAt");
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-product-module-"),
  );
  temporaryDirectories.push(workingDirectory);

  const application = await startApplication({
    workingDirectory,
    port: 0,
  });
  applications.push(application);

  return {
    application,
    workingDirectory,
  };
}
