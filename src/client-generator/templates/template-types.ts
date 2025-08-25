/* Shared template data structures and interfaces */

/*
 * Configuration for function declaration generation
 */
export type FunctionDeclarationConfig = TypeScriptCodeConfig & {
  readonly body: string;
  readonly functionName: string;
  readonly genericParams?: string;
  readonly isAsync?: boolean;
  readonly parameters: string;
  readonly returnType?: string;
  readonly summary?: string;
};

/*
 * Configuration for interface declaration generation
 */
export type InterfaceDeclarationConfig = TypeScriptCodeConfig & {
  readonly extends?: string[];
  readonly genericParams?: string;
  readonly interfaceName: string;
  readonly properties: {
    name: string;
    optional?: boolean;
    readonly?: boolean;
    type: string;
  }[];
  readonly summary?: string;
};

/*
 * Template generation context
 */
export type TemplateContext = {
  readonly exports: Set<string>;
  readonly generatedTypes: Set<string>;
  readonly imports: Set<string>;
  readonly outputPath: string;
};

/*
 * Template error information
 */
export type TemplateError = Error & {
  readonly context?: unknown;
  readonly suggestions?: string[];
  readonly templateName: string;
};

/*
 * Standard interface for template functions
 */
export type TemplateFunction<TInput = unknown, TOutput = string> = (
  input: TInput,
  config?: TemplateRenderConfig,
) => TOutput;

/*
 * Configuration interface for template rendering options
 */
export type TemplateRenderConfig = {
  readonly indentLevel?: number;
  readonly spacesPerIndent?: number;
  readonly useSpaces?: boolean;
};

/*
 * Template validation result
 */
export type TemplateValidationResult = {
  readonly errors: string[];
  readonly isValid: boolean;
  readonly warnings: string[];
};

/*
 * Configuration for type declaration generation
 */
export type TypeDeclarationConfig = TypeScriptCodeConfig & {
  readonly genericParams?: string;
  readonly summary?: string;
  readonly typeDefinition: string;
  readonly typeName: string;
};

/*
 * Configuration for TypeScript code generation
 */
export type TypeScriptCodeConfig = TemplateRenderConfig & {
  readonly constKeyword?: boolean;
  readonly exportKeyword?: boolean;
  readonly readonly?: boolean;
};

/*
 * Configuration for utility function rendering
 */
export type UtilityFunctionConfig = TypeScriptCodeConfig & {
  readonly exports?: string[];
  readonly functions: FunctionDeclarationConfig[];
  readonly imports?: string[];
};
