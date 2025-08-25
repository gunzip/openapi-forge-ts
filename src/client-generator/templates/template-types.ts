/* Shared template data structures and interfaces for code generation */

export type IndentationConfig = {
  /** Base indentation level (number of spaces per level) */
  baseIndent: number;
  /** Current indentation level */
  level: number;
};

export type CodeFormattingOptions = {
  /** Whether to include trailing newlines */
  includeTrailingNewline?: boolean;
  /** Indentation configuration */
  indentation?: IndentationConfig;
  /** Whether to preserve empty lines */
  preserveEmptyLines?: boolean;
};

export type TypeScriptSyntaxOptions = {
  /** Whether to include JSDoc comments */
  includeJSDoc?: boolean;
  /** Whether to prefer const assertions */
  useConstAssertions?: boolean;
  /** Export style preference */
  exportStyle?: "named" | "default";
};

/* Template validation result */
export type TemplateValidationResult = {
  /** Whether the template is valid */
  isValid: boolean;
  /** Validation error messages */
  errors: string[];
  /** Warning messages */
  warnings: string[];
};

/* Template rendering context */
export type TemplateRenderContext = {
  /** Current indentation level */
  indentLevel: number;
  /** Template formatting options */
  formatting: CodeFormattingOptions;
  /** TypeScript syntax preferences */
  syntax: TypeScriptSyntaxOptions;
};

/* Template function metadata */
export type TemplateFunctionInfo = {
  /** Function name */
  name: string;
  /** Function description */
  description?: string;
  /** Input parameter types */
  inputTypes: string[];
  /** Output type */
  outputType: string;
  /** Whether the function is async */
  isAsync?: boolean;
};

/* Template module configuration */
export type TemplateModuleConfig = {
  /** Module name */
  name: string;
  /** Template functions in this module */
  functions: TemplateFunctionInfo[];
  /** Dependencies on other template modules */
  dependencies: string[];
};