import type {
  CodeFormattingOptions,
  IndentationConfig,
  TemplateRenderContext,
  TemplateValidationResult,
  TypeScriptSyntaxOptions,
} from "./template-types.js";

/* Code indentation and formatting utilities */

/**
 * Creates an indentation string for the given level
 * @param level - Indentation level (0-based)
 * @param spacesPerLevel - Number of spaces per indentation level (default: 2)
 */
export function createIndent(level: number, spacesPerLevel = 2): string {
  return " ".repeat(level * spacesPerLevel);
}

/**
 * Indents each line of a multi-line string by the specified level
 * @param code - The code string to indent
 * @param level - Indentation level to apply
 * @param spacesPerLevel - Number of spaces per indentation level (default: 2)
 * @param preserveEmptyLines - Whether to preserve empty lines (default: true)
 */
export function indentCode(
  code: string,
  level: number,
  spacesPerLevel = 2,
  preserveEmptyLines = true,
): string {
  const indent = createIndent(level, spacesPerLevel);
  return code
    .split("\n")
    .map((line) => {
      /* Preserve empty lines if requested */
      if (preserveEmptyLines && line.trim() === "") {
        return line;
      }
      return line ? `${indent}${line}` : line;
    })
    .join("\n");
}

/**
 * Removes common leading whitespace from a multi-line string
 * @param code - The code string to dedent
 */
export function dedentCode(code: string): string {
  const lines = code.split("\n");
  
  /* Find minimum indentation (excluding empty lines) */
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === "") continue;
    const leadingSpaces = line.length - line.trimStart().length;
    minIndent = Math.min(minIndent, leadingSpaces);
  }
  
  if (minIndent === Infinity || minIndent === 0) {
    return code;
  }
  
  /* Remove common indentation */
  return lines
    .map((line) => line.substring(minIndent))
    .join("\n");
}

/* TypeScript syntax helpers */

/**
 * Wraps code in a TypeScript interface declaration
 * @param name - Interface name
 * @param properties - Interface properties
 * @param isExported - Whether to export the interface (default: true)
 */
export function wrapInInterface(
  name: string,
  properties: string,
  isExported = true,
): string {
  const exportKeyword = isExported ? "export " : "";
  return `${exportKeyword}interface ${name} {\n${indentCode(properties, 1)}\n}`;
}

/**
 * Wraps code in a TypeScript type alias declaration
 * @param name - Type alias name
 * @param definition - Type definition
 * @param isExported - Whether to export the type (default: true)
 */
export function wrapInTypeAlias(
  name: string,
  definition: string,
  isExported = true,
): string {
  const exportKeyword = isExported ? "export " : "";
  return `${exportKeyword}type ${name} = ${definition};`;
}

/**
 * Wraps code in a TypeScript function declaration
 * @param name - Function name
 * @param parameters - Function parameters
 * @param returnType - Return type
 * @param body - Function body
 * @param options - Additional options
 */
export function wrapInFunction(
  name: string,
  parameters: string,
  returnType: string,
  body: string,
  options: {
    isAsync?: boolean;
    isExported?: boolean;
    genericParams?: string;
    jsdoc?: string;
  } = {},
): string {
  const {
    isAsync = false,
    isExported = true,
    genericParams = "",
    jsdoc = "",
  } = options;
  
  const exportKeyword = isExported ? "export " : "";
  const asyncKeyword = isAsync ? "async " : "";
  const generics = genericParams ? `${genericParams}` : "";
  const docComment = jsdoc ? `${jsdoc}\n` : "";
  
  return `${docComment}${exportKeyword}${asyncKeyword}function ${name}${generics}(\n${indentCode(parameters, 1)}\n): ${returnType} {\n${indentCode(body, 1)}\n}`;
}

/**
 * Creates a JSDoc comment
 * @param description - Main description
 * @param params - Parameter descriptions (optional)
 * @param returns - Return description (optional)
 */
export function createJSDoc(
  description: string,
  params: Array<{ name: string; description: string }> = [],
  returns?: string,
): string {
  const lines = [`/**`, ` * ${description}`];
  
  if (params.length > 0) {
    lines.push(" *");
    for (const param of params) {
      lines.push(` * @param ${param.name} - ${param.description}`);
    }
  }
  
  if (returns) {
    lines.push(" *", ` * @returns ${returns}`);
  }
  
  lines.push(" */");
  return lines.join("\n");
}

/* Template validation utilities */

/**
 * Validates TypeScript syntax in generated code
 * @param code - The generated code to validate
 */
export function validateTypeScriptSyntax(code: string): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  /* Basic syntax validation */
  const lines = code.split("\n");
  let braceCount = 0;
  let parenCount = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    /* Count braces and parentheses */
    for (const char of line) {
      if (char === "{") braceCount++;
      if (char === "}") braceCount--;
      if (char === "(") parenCount++;
      if (char === ")") parenCount--;
    }
    
    /* Check for common syntax issues */
    if (line.includes("export export")) {
      errors.push(`Line ${lineNum}: Duplicate export keyword`);
    }
    
    if (line.trim().endsWith(";;")) {
      warnings.push(`Line ${lineNum}: Double semicolon found`);
    }
  }
  
  /* Check for unmatched braces/parentheses */
  if (braceCount !== 0) {
    errors.push(`Unmatched braces: ${braceCount > 0 ? "missing closing" : "extra closing"} brace(s)`);
  }
  
  if (parenCount !== 0) {
    errors.push(`Unmatched parentheses: ${parenCount > 0 ? "missing closing" : "extra closing"} parenthesis(es)`);
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validates template configuration
 * @param config - Template render context to validate
 */
export function validateTemplateConfig(
  config: TemplateRenderContext,
): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  if (config.indentLevel < 0) {
    errors.push("Indentation level cannot be negative");
  }
  
  if (config.indentLevel > 10) {
    warnings.push("Very deep indentation level detected (>10)");
  }
  
  if (config.formatting.indentation?.baseIndent !== undefined && config.formatting.indentation.baseIndent < 1) {
    errors.push("Base indentation must be at least 1 space");
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/* Template formatting utilities */

/**
 * Applies consistent formatting to generated code
 * @param code - The code to format
 * @param options - Formatting options
 */
export function formatGeneratedCode(
  code: string,
  options: CodeFormattingOptions = {},
): string {
  let formatted = code;
  
  /* Apply indentation if specified */
  if (options.indentation) {
    const { level, baseIndent } = options.indentation;
    formatted = indentCode(formatted, level, baseIndent, options.preserveEmptyLines);
  }
  
  /* Add trailing newline if requested */
  if (options.includeTrailingNewline && !formatted.endsWith("\n")) {
    formatted += "\n";
  }
  
  /* Remove trailing newline if not requested */
  if (options.includeTrailingNewline === false && formatted.endsWith("\n")) {
    formatted = formatted.slice(0, -1);
  }
  
  return formatted;
}

/**
 * Creates a default template render context
 * @param overrides - Optional overrides for default values
 */
export function createDefaultRenderContext(
  overrides: Partial<TemplateRenderContext> = {},
): TemplateRenderContext {
  const defaultFormatting = {
    includeTrailingNewline: true,
    indentation: { baseIndent: 2, level: 0 },
    preserveEmptyLines: true,
  };
  
  const defaultSyntax = {
    includeJSDoc: true,
    useConstAssertions: false,
    exportStyle: "named" as const,
  };

  const result = {
    indentLevel: 0,
    formatting: {
      ...defaultFormatting,
      ...overrides.formatting,
    },
    syntax: {
      ...defaultSyntax,
      ...overrides.syntax,
    },
    ...overrides,
  };

  /* Re-apply formatting and syntax in case overrides has top-level changes */
  result.formatting = {
    ...defaultFormatting,
    ...overrides.formatting,
  };
  
  result.syntax = {
    ...defaultSyntax,
    ...overrides.syntax,
  };

  return result;
}