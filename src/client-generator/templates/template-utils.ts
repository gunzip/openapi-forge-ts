/* Shared template utilities for code generation and formatting */

import type {
  FunctionDeclarationConfig,
  InterfaceDeclarationConfig,
  TemplateRenderConfig,
  TemplateValidationResult,
  TypeDeclarationConfig,
  TypeScriptCodeConfig,
} from "./template-types.js";

/*
 * Default template rendering configuration
 */
export const DEFAULT_TEMPLATE_CONFIG: Required<TemplateRenderConfig> = {
  indentLevel: 0,
  spacesPerIndent: 2,
  useSpaces: true,
} as const;

/*
 * Combines multiple template strings with proper spacing
 */
export function combineTemplates(
  templates: string[],
  separator = "\n\n",
): string {
  return templates
    .filter((template) => template.trim().length > 0)
    .join(separator);
}

/*
 * Creates a standardized export statement
 */
export function createExportStatement(
  exportName: string,
  exportType: "const" | "function" | "interface" | "type" = "function",
): string {
  switch (exportType) {
    case "const":
      return `export { ${exportName} };`;
    case "function":
      return `export { ${exportName} };`;
    case "interface":
      return `export type { ${exportName} };`;
    case "type":
      return `export type { ${exportName} };`;
    default:
      return `export { ${exportName} };`;
  }
}

/*
 * Creates indentation string based on configuration
 */
export function createIndentation(config: TemplateRenderConfig = {}): string {
  const { indentLevel = 0, spacesPerIndent = 2, useSpaces = true } = config;

  if (indentLevel <= 0) {
    return "";
  }

  if (useSpaces) {
    return " ".repeat(indentLevel * spacesPerIndent);
  }

  return "\t".repeat(indentLevel);
}

/*
 * Escapes special characters in string for template generation
 */
export function escapeTemplateString(str: string): string {
  return str
    .replace(/\\/g, "\\\\")
    .replace(/`/g, "\\`")
    .replace(/\${/g, "\\${")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

/*
 * Formats TypeScript code with basic indentation and spacing
 */
export function formatTypeScriptCode(code: string): string {
  /* Basic code formatting without configuration for now */
  return code
    .replace(/\s*{\s*/g, " {\n")
    .replace(/;\s*}/g, ";\n}")
    .replace(/,\s*}/g, ",\n}")
    .replace(/{\s*}/g, "{}")
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");
}

/*
 * Indents a multi-line string by the specified level
 */
export function indentLines(
  text: string,
  config: TemplateRenderConfig = {},
): string {
  const indentation = createIndentation(config);

  if (!indentation) {
    return text;
  }

  return text
    .split("\n")
    .map((line) => (line.trim() ? indentation + line : line))
    .join("\n");
}

/*
 * Renders a TypeScript function declaration
 */
export function renderFunctionDeclaration(
  config: FunctionDeclarationConfig,
): string {
  const parts: string[] = [];

  /* Add summary comment if provided */
  if (config.summary) {
    parts.push(`/* ${config.summary} */`);
  }

  /* Build function signature */
  const exportKeyword = config.exportKeyword ? "export " : "";
  const asyncKeyword = config.isAsync ? "async " : "";
  const genericParams = config.genericParams ? `<${config.genericParams}>` : "";
  const returnType = config.returnType ? `: ${config.returnType}` : "";

  const signature = `${exportKeyword}${asyncKeyword}function ${config.functionName}${genericParams}(${config.parameters})${returnType}`;

  parts.push(`${signature} {`);
  parts.push(indentLines(config.body, { indentLevel: 1 }));
  parts.push("}");

  return parts.join("\n");
}

/*
 * Renders a TypeScript interface declaration
 */
export function renderInterfaceDeclaration(
  config: InterfaceDeclarationConfig,
): string {
  const parts: string[] = [];

  /* Add summary comment if provided */
  if (config.summary) {
    parts.push(`/* ${config.summary} */`);
  }

  /* Build interface declaration */
  const exportKeyword = config.exportKeyword ? "export " : "";
  const genericParams = config.genericParams ? `<${config.genericParams}>` : "";
  const extendsClause = config.extends?.length
    ? ` extends ${config.extends.join(", ")}`
    : "";

  parts.push(
    `${exportKeyword}interface ${config.interfaceName}${genericParams}${extendsClause} {`,
  );

  /* Add properties */
  for (const property of config.properties) {
    const readonlyKeyword = property.readonly ? "readonly " : "";
    const optionalMarker = property.optional ? "?" : "";
    const propertyLine = `  ${readonlyKeyword}${property.name}${optionalMarker}: ${property.type};`;
    parts.push(propertyLine);
  }

  parts.push("}");

  return parts.join("\n");
}

/*
 * Renders a TypeScript type declaration
 */
export function renderTypeDeclaration(config: TypeDeclarationConfig): string {
  const parts: string[] = [];

  /* Add summary comment if provided */
  if (config.summary) {
    parts.push(`/* ${config.summary} */`);
  }

  /* Build type declaration */
  const exportKeyword = config.exportKeyword ? "export " : "";
  const genericParams = config.genericParams ? `<${config.genericParams}>` : "";

  parts.push(
    `${exportKeyword}type ${config.typeName}${genericParams} = ${config.typeDefinition};`,
  );

  return parts.join("\n");
}

/*
 * Renders a union type from array of type strings
 */
export function renderUnionType(
  types: string[],
  config: TypeScriptCodeConfig = {},
): string {
  if (types.length === 0) {
    return "never";
  }

  if (types.length === 1) {
    return types[0];
  }

  /* Join with proper spacing and line breaks for readability */
  if (types.length <= 3) {
    return types.join(" | ");
  }

  /* For longer unions, use multi-line format */
  const indentation = createIndentation({ indentLevel: 1, ...config });
  return `\n${indentation}| ${types.join(`\n${indentation}| `)}`;
}

/*
 * Validates a template string for common issues
 */
export function validateTemplate(
  template: string,
  templateName = "unknown",
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  /* Check for unescaped template literals */
  const unescapedBackticks = (template.match(/(?<!\\)`/g) || []).length;
  if (unescapedBackticks % 2 !== 0) {
    errors.push(`Unmatched template literal backticks in ${templateName}`);
  }

  /* Check for potential template injection */
  if (template.includes("${") && !template.includes("\\${")) {
    warnings.push(
      `Potential template injection vulnerability in ${templateName}`,
    );
  }

  /* Check for excessive line length */
  const lines = template.split("\n");
  const longLines = lines.filter((line) => line.length > 120);
  if (longLines.length > 0) {
    warnings.push(`Lines exceeding 120 characters found in ${templateName}`);
  }

  /* Check for missing exports in template functions */
  if (template.includes("function ") && !template.includes("export")) {
    warnings.push(`Missing export keyword for functions in ${templateName}`);
  }

  return {
    errors,
    isValid: errors.length === 0,
    warnings,
  };
}

/*
 * Wraps content in template literal for code generation
 */
export function wrapInTemplateLiteral(content: string): string {
  return `\`${content.replace(/`/g, "\\`").replace(/\${/g, "\\${")}\``;
}
