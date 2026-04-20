export interface ProductRecord {
  productId: string;
  name: string;
  contentRef: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSummary {
  productId: string;
  name: string;
  updatedAt: string;
}

export interface ProductDetail {
  productId: string;
  name: string;
  contentMarkdown: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductInput {
  name: string;
  contentMarkdown: string;
}

export interface UpdateProductInput {
  name: string;
  contentMarkdown: string;
}

export interface ListProductsResult {
  items: ProductSummary[];
}

export interface ProductMetadataStore {
  createProduct(record: ProductRecord): Promise<void>;
  updateProduct(
    productId: string,
    updates: Pick<ProductRecord, "name" | "updatedAt">,
  ): Promise<void>;
  getProductById(productId: string): Promise<ProductRecord | undefined>;
  listProducts(): Promise<ProductSummary[]>;
  deleteProduct(productId: string): Promise<void>;
  close(): void;
}

export interface ProductContentStore {
  writeContent(contentRef: string, contentMarkdown: string): Promise<void>;
  readContent(contentRef: string): Promise<string>;
  deleteContent(contentRef: string): Promise<void>;
}
