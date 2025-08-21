// Re-export types
export type {
  ZodSchemaResult,
  ZodSchemaCodeOptions,
  OpenAPISchema,
} from "./schema-converter.js";

export type { SchemaFileResult } from "./file-generators.js";

export type { ExtensibleEnumResult } from "./enum-handlers.js";

export type { EffectiveType } from "./utils.js";

export type { UnionType, DiscriminatorConfig } from "./union-types.js";

// Re-export main conversion function
export { zodSchemaToCode } from "./schema-converter.js";

// Re-export file generation functions
export {
  generateSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
} from "./file-generators.js";

// Re-export utility functions for advanced usage
export {
  inferEffectiveType,
  isNullable,
  cloneWithoutNullable,
  analyzeTypeArray,
  addDefaultValue,
  mergeImports,
} from "./utils.js";

// Re-export specialized handlers for custom usage
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
