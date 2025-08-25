import { describe, expect, it } from "vitest";

import {
  // Test that the main template module exports all needed functions and types
  TEMPLATE_MODULES,
  TEMPLATE_FUNCTIONS,
  indentCode,
  createJSDoc,
  wrapInFunction,
  validateTypeScriptSyntax,
  validateTemplateConfig,
  formatGeneratedCode,
  renderOperationFunction,
  buildGenericParams,
  createDefaultRenderContext,
  type OperationFunctionRenderConfig,
} from "../../src/client-generator/templates/index.js";

describe("template infrastructure end-to-end", () => {
  it("should provide complete centralized template management", () => {
    /* Verify that the template registry is complete */
    expect(TEMPLATE_MODULES.OPERATION).toBe("operation-templates");
    expect(TEMPLATE_MODULES.UTILS).toBe("template-utils");
    expect(TEMPLATE_MODULES.TYPES).toBe("template-types");
    
    expect(TEMPLATE_FUNCTIONS.indentCode).toBe("indentCode");
    expect(TEMPLATE_FUNCTIONS.renderOperationFunction).toBe("renderOperationFunction");
    expect(TEMPLATE_FUNCTIONS.validateTypeScriptSyntax).toBe("validateTypeScriptSyntax");
  });

  it("should generate a complete operation function using centralized utilities", () => {
    /* Test the full template generation pipeline */
    
    // Step 1: Use template utilities to build function components
    const functionBody = indentCode(
      "const response = await fetch(url);\nreturn response.json();",
      1
    );
    
    const jsdocComment = createJSDoc(
      "Fetches user data from the API",
      [{ name: "id", description: "The user ID to fetch" }],
      "Promise resolving to user data"
    );
    
    // Step 2: Build generic parameters using operation templates
    const genericConfig = {
      shouldGenerateRequestMap: false,
      shouldGenerateResponseMap: true,
      contentTypeMaps: {
        defaultRequestContentType: null,
        defaultResponseContentType: "application/json",
        requestContentTypeCount: 0,
        requestMapType: "{}",
        responseContentTypeCount: 2,
        responseMapType: "{ 'application/json': User; 'text/plain': string; }",
        typeImports: new Set<string>(),
      },
      requestMapTypeName: "GetUserRequestMap",
      responseMapTypeName: "GetUserResponseMap",
      initialReturnType: "ApiResponse<200, User>",
    };
    
    const { genericParams, updatedReturnType } = buildGenericParams(genericConfig);
    
    // Step 3: Create the complete operation function configuration
    const operationConfig: OperationFunctionRenderConfig = {
      functionName: "getUser",
      summary: `${jsdocComment}\n`,
      genericParams,
      parameterDeclaration: "{ path }: { path: { id: string } }",
      updatedReturnType,
      functionBodyCode: functionBody,
      typeAliases: "export type GetUserResponseMap = { 'application/json': User; 'text/plain': string; };\n\n",
    };
    
    // Step 4: Render the complete operation function
    const operationCode = renderOperationFunction(operationConfig);
    
    // Step 5: Validate the generated code
    const validation = validateTypeScriptSyntax(operationCode);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
    
    // Step 6: Apply final formatting
    const formattedCode = formatGeneratedCode(operationCode, {
      includeTrailingNewline: true,
      preserveEmptyLines: true,
    });
    
    /* Verify the final result contains all expected elements */
    expect(formattedCode).toContain("export type GetUserResponseMap");
    expect(formattedCode).toContain("Fetches user data from the API");
    expect(formattedCode).toContain("@param id - The user ID to fetch");
    expect(formattedCode).toContain("@returns Promise resolving to user data");
    expect(formattedCode).toContain("export async function getUser");
    expect(formattedCode).toContain('<TResponseContentType extends keyof GetUserResponseMap = "application/json">');
    expect(formattedCode).toContain("GetUserResponseMap[TResponseContentType]");
    expect(formattedCode).toContain("  const response = await fetch(url);");
    expect(formattedCode).toContain("  return response.json();");
  });

  it("should provide consistent template validation and error handling", () => {
    /* Test template validation capabilities */
    
    // Test configuration validation
    const invalidConfig = createDefaultRenderContext({
      indentLevel: -5,
      formatting: { 
        indentation: { baseIndent: 0, level: 0 } 
      }
    });
    
    const configValidation = validateTemplateConfig(invalidConfig);
    expect(configValidation.isValid).toBe(false);
    expect(configValidation.errors).toContain("Indentation level cannot be negative");
    expect(configValidation.errors).toContain("Base indentation must be at least 1 space");
    
    // Test TypeScript syntax validation
    const invalidCode = "function test() { return 1;"; // Missing closing brace
    const syntaxValidation = validateTypeScriptSyntax(invalidCode);
    expect(syntaxValidation.isValid).toBe(false);
    expect(syntaxValidation.errors).toContain("Unmatched braces: missing closing brace(s)");
  });

  it("should demonstrate template utility composition", () => {
    /* Test how different template utilities work together */
    
    // Create a complex TypeScript structure using multiple utilities
    const interfaceProperties = [
      "id: string;",
      "name: string;",
      "email?: string;",
    ].join("\n");
    
    const indentedProps = indentCode(interfaceProperties, 1);
    
    const userInterface = `export interface User {\n${indentedProps}\n}`;
    
    const functionBody = [
      "const user = await fetchUser(id);",
      "return {",
      "  status: 200 as const,",
      "  data: user,",
      "  response: mockResponse",
      "};",
    ].join("\n");
    
    const indentedBody = indentCode(functionBody, 1);
    
    const fullFunction = wrapInFunction(
      "getUserById",
      "id: string",
      "Promise<ApiResponse<200, User>>",
      indentedBody,
      { 
        isAsync: true,
        isExported: true,
        jsdoc: createJSDoc("Retrieves a user by ID", [{ name: "id", description: "User ID" }])
      }
    );
    
    const completeCode = `${userInterface}\n\n${fullFunction}`;
    
    /* Validate the composed result */
    const validation = validateTypeScriptSyntax(completeCode);
    expect(validation.isValid).toBe(true);
    
    /* Check that all elements are properly formatted */
    expect(completeCode).toContain("export interface User");
    expect(completeCode).toContain("  id: string;");
    expect(completeCode).toContain("  name: string;");
    expect(completeCode).toContain("export async function getUserById");
    expect(completeCode).toContain("  const user = await fetchUser(id);");
    expect(completeCode).toContain("    status: 200 as const,");
    expect(completeCode).toContain("* Retrieves a user by ID");
    expect(completeCode).toContain("* @param id - User ID");
  });
});