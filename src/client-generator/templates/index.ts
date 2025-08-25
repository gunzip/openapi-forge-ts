/* Main template coordination module for centralized template management */

export * from "./template-types.js";
export * from "./template-utils.js";
export * from "./operation-templates.js";

/* Template module registry */
export const TEMPLATE_MODULES = {
  OPERATION: "operation-templates",
  TYPES: "template-types", 
  UTILS: "template-utils",
} as const;

/* Template function registry for validation and testing */
export const TEMPLATE_FUNCTIONS = {
  /* Operation template functions */
  buildGenericParams: "buildGenericParams",
  buildParameterDeclaration: "buildParameterDeclaration", 
  buildTypeAliases: "buildTypeAliases",
  renderOperationFunction: "renderOperationFunction",
  
  /* Utility template functions */
  createIndent: "createIndent",
  indentCode: "indentCode",
  dedentCode: "dedentCode",
  wrapInInterface: "wrapInInterface",
  wrapInTypeAlias: "wrapInTypeAlias",
  wrapInFunction: "wrapInFunction",
  createJSDoc: "createJSDoc",
  validateTypeScriptSyntax: "validateTypeScriptSyntax",
  validateTemplateConfig: "validateTemplateConfig",
  formatGeneratedCode: "formatGeneratedCode",
  createDefaultRenderContext: "createDefaultRenderContext",
} as const;

/* Re-export operation template functions for backward compatibility */
export {
  buildGenericParams,
  buildParameterDeclaration,
  buildTypeAliases,
  renderOperationFunction,
  type ContentTypeMapsConfig,
  type GenericParamsConfig,
  type GenericParamsResult,
  type OperationFunctionRenderConfig,
  type OperationMetadata,
  type ParameterDeclarationConfig,
  type TypeAliasesConfig,
} from "./operation-templates.js";

/* Re-export template utilities */
export {
  createIndent,
  indentCode,
  dedentCode,
  wrapInInterface,
  wrapInTypeAlias,
  wrapInFunction,
  createJSDoc,
  validateTypeScriptSyntax,
  validateTemplateConfig,
  formatGeneratedCode,
  createDefaultRenderContext,
} from "./template-utils.js";

/* Re-export template types */
export type {
  CodeFormattingOptions,
  IndentationConfig,
  TemplateRenderContext,
  TemplateValidationResult,
  TypeScriptSyntaxOptions,
  TemplateFunctionInfo,
  TemplateModuleConfig,
} from "./template-types.js";