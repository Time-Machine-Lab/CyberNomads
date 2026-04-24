import { randomUUID } from "node:crypto";

import { ProductNotFoundError, ProductValidationError } from "./errors.js";
import type {
  CreateProductInput,
  ListProductsResult,
  ProductContentStore,
  ProductDetail,
  ProductMetadataStore,
  ProductRecord,
  UpdateProductInput,
} from "./types.js";

export interface ProductServiceOptions {
  metadataStore: ProductMetadataStore;
  contentStore: ProductContentStore;
  now?: () => Date;
  createProductId?: () => string;
}

export class ProductService {
  private readonly metadataStore: ProductMetadataStore;
  private readonly contentStore: ProductContentStore;
  private readonly now: () => Date;
  private readonly createProductId: () => string;

  constructor(options: ProductServiceOptions) {
    this.metadataStore = options.metadataStore;
    this.contentStore = options.contentStore;
    this.now = options.now ?? (() => new Date());
    this.createProductId = options.createProductId ?? (() => randomUUID());
  }

  async createProduct(input: CreateProductInput): Promise<ProductDetail> {
    const normalizedInput = normalizeProductInput(input);
    const timestamp = this.now().toISOString();
    const productId = this.createProductId();
    const contentRef = `${productId}.md`;

    const record: ProductRecord = {
      productId,
      name: normalizedInput.name,
      contentRef,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.metadataStore.createProduct(record);

    try {
      await this.contentStore.writeContent(
        contentRef,
        normalizedInput.contentMarkdown,
      );
    } catch (error) {
      await this.metadataStore.deleteProduct(productId);
      throw error;
    }

    return toProductDetail(record, normalizedInput.contentMarkdown);
  }

  async updateProduct(
    productId: string,
    input: UpdateProductInput,
  ): Promise<ProductDetail> {
    const normalizedInput = normalizeProductInput(input);
    const existingRecord = await this.metadataStore.getProductById(productId);

    if (!existingRecord) {
      throw new ProductNotFoundError(productId);
    }

    const updatedAt = this.now().toISOString();

    await this.metadataStore.updateProduct(productId, {
      name: normalizedInput.name,
      updatedAt,
    });

    try {
      await this.contentStore.writeContent(
        existingRecord.contentRef,
        normalizedInput.contentMarkdown,
      );
    } catch (error) {
      await this.metadataStore.updateProduct(productId, {
        name: existingRecord.name,
        updatedAt: existingRecord.updatedAt,
      });
      throw error;
    }

    return toProductDetail(
      {
        ...existingRecord,
        name: normalizedInput.name,
        updatedAt,
      },
      normalizedInput.contentMarkdown,
    );
  }

  async listProducts(): Promise<ListProductsResult> {
    return {
      items: await this.metadataStore.listProducts(),
    };
  }

  async getProductDetail(productId: string): Promise<ProductDetail> {
    const record = await this.metadataStore.getProductById(productId);

    if (!record) {
      throw new ProductNotFoundError(productId);
    }

    const contentMarkdown = await this.contentStore.readContent(
      record.contentRef,
    );

    return toProductDetail(record, contentMarkdown);
  }

  async deleteProduct(productId: string): Promise<void> {
    const existingRecord = await this.metadataStore.getProductById(productId);

    if (!existingRecord) {
      throw new ProductNotFoundError(productId);
    }

    await this.contentStore.deleteContent(existingRecord.contentRef);
    await this.metadataStore.deleteProduct(productId);
  }

  close(): void {
    this.metadataStore.close();
  }
}

function normalizeProductInput(
  input: CreateProductInput | UpdateProductInput,
): CreateProductInput | UpdateProductInput {
  if (typeof input.name !== "string") {
    throw new ProductValidationError("Product name must be a string.");
  }

  if (typeof input.contentMarkdown !== "string") {
    throw new ProductValidationError(
      "Product contentMarkdown must be a string.",
    );
  }

  const normalizedName = input.name.trim();

  if (normalizedName.length === 0) {
    throw new ProductValidationError("Product name is required.");
  }

  if (input.contentMarkdown.trim().length === 0) {
    throw new ProductValidationError("Product contentMarkdown is required.");
  }

  return {
    name: normalizedName,
    contentMarkdown: input.contentMarkdown,
  };
}

function toProductDetail(
  record: ProductRecord,
  contentMarkdown: string,
): ProductDetail {
  return {
    productId: record.productId,
    name: record.name,
    contentMarkdown,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}
