import { DatabaseSync } from "node:sqlite";

import type {
  ProductMetadataStore,
  ProductRecord,
  ProductSummary,
} from "../../../modules/products/types.js";

interface ProductRow {
  product_id: string;
  name: string;
  content_ref: string;
  created_at: string;
  updated_at: string;
}

interface ProductSummaryRow {
  productId: string;
  name: string;
  updatedAt: string;
}

export class SqliteProductRepository implements ProductMetadataStore {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createProduct(record: ProductRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO products (
            product_id,
            name,
            content_ref,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.productId,
        record.name,
        record.contentRef,
        record.createdAt,
        record.updatedAt,
      );
  }

  async updateProduct(
    productId: string,
    updates: Pick<ProductRecord, "name" | "updatedAt">,
  ): Promise<void> {
    this.database
      .prepare(
        `
          UPDATE products
          SET name = ?, updated_at = ?
          WHERE product_id = ?
        `,
      )
      .run(updates.name, updates.updatedAt, productId);
  }

  async getProductById(productId: string): Promise<ProductRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            product_id,
            name,
            content_ref,
            created_at,
            updated_at
          FROM products
          WHERE product_id = ?
        `,
      )
      .get(productId) as ProductRow | undefined;

    return row ? mapProductRow(row) : undefined;
  }

  async listProducts(): Promise<ProductSummary[]> {
    const rows = this.database
      .prepare(
        `
          SELECT
            product_id AS productId,
            name,
            updated_at AS updatedAt
          FROM products
          ORDER BY updated_at DESC, product_id DESC
        `,
      )
      .all() as unknown as ProductSummaryRow[];

    return rows.map((row) => ({
      productId: row.productId,
      name: row.name,
      updatedAt: row.updatedAt,
    }));
  }

  async deleteProduct(productId: string): Promise<void> {
    this.database
      .prepare("DELETE FROM products WHERE product_id = ?")
      .run(productId);
  }

  close(): void {
    this.database.close();
  }
}

function mapProductRow(row: ProductRow): ProductRecord {
  return {
    productId: row.product_id,
    name: row.name,
    contentRef: row.content_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
