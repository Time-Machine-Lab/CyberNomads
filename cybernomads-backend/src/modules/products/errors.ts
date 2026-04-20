export class ProductModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "ProductModuleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class ProductValidationError extends ProductModuleError {
  constructor(message: string) {
    super("PRODUCT_VALIDATION_FAILED", 400, message);
  }
}

export class ProductNotFoundError extends ProductModuleError {
  constructor(productId: string) {
    super("PRODUCT_NOT_FOUND", 404, `Product "${productId}" was not found.`);
  }
}

export function isProductModuleError(
  error: unknown,
): error is ProductModuleError {
  return error instanceof ProductModuleError;
}
