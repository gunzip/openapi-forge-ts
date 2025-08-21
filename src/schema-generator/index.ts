// Main exports - commonly used functions and types
export {
  zodSchemaToCode,
  type ZodSchemaResult,
  type ZodSchemaCodeOptions,
  type OpenAPISchema,
} from "./schema-converter.js";

export {
  generateSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
  type SchemaFileResult,
} from "./file-generators.js";

// Advanced exports for custom usage
export type { ExtensibleEnumResult } from "./enum-handlers.js";

export type { EffectiveType } from "./utils.js";

export type { UnionType, DiscriminatorConfig } from "./union-types.js";

// Utility exports
export {
  isSchemaObject,
  inferEffectiveType,
  isNullable,
  cloneWithoutNullable,
  analyzeTypeArray,
  addDefaultValue,
  mergeImports,
} from "./utils.js";

// Specialized handler exports
export { handleExtensibleEnum, handleRegularEnum } from "./enum-handlers.js";

export {
  handleStringType,
  handleNumberType,
  handleBooleanType,
  handleArrayType,
} from "./primitive-types.js";

export { handleObjectType } from "./object-types.js";

export { handleAllOfSchema, handleUnionSchema } from "./union-types.js";

export { handleReference } from "./reference-handlers.js";
