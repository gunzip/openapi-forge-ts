import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/*
 * Integration test for dynamic force validation feature
 * Tests that the generated code has the correct structure to support
 * both manual and force validation modes at runtime
 */

describe("Dynamic Force Validation Integration Test", () => {
  const generatedDir = "tests/integrations/generated";

  it("should generate operations with generic TForceValidation parameter", () => {
    const operationPath = join(
      generatedDir,
      "client/testDeserialization.ts",
    );

    const operationContent = readFileSync(operationPath, "utf-8");

    // Should include TForceValidation generic parameter
    expect(operationContent).toContain("TForceValidation extends boolean = false");
    
    // Should have forceValidation in config parameter  
    expect(operationContent).toContain("forceValidation?: TForceValidation");

    // Should use conditional return types
    expect(operationContent).toContain("TForceValidation extends true");
    expect(operationContent).toContain("ApiResponseWithForcedParse");
    expect(operationContent).toContain("ApiResponseWithParse");

    // Should have runtime conditional logic
    expect(operationContent).toContain("if (config.forceValidation)");
  });

  it("should generate config with forceValidation property", () => {
    const configPath = join(generatedDir, "client/config.ts");
    const configContent = readFileSync(configPath, "utf-8");

    // Should include forceValidation in GlobalConfig interface
    expect(configContent).toContain("forceValidation?: boolean");

    // Should include both ApiResponseWithParse and ApiResponseWithForcedParse types
    expect(configContent).toContain("ApiResponseWithParse");
    expect(configContent).toContain("ApiResponseWithForcedParse");

    // Should include configureOperations with TForceValidation support
    expect(configContent).toContain("TForceValidation extends boolean");
    expect(configContent).toContain("ReplaceWithForcedParse");
  });

  it("should generate operations that support both validation modes", () => {
    const operationPath = join(
      generatedDir,
      "client/testMultiContentTypes.ts",
    );

    const operationContent = readFileSync(operationPath, "utf-8");

    // Should include both response branches (manual and force validation)
    expect(operationContent).toContain("if (config.forceValidation)");
    expect(operationContent).toContain("else {");

    // Force validation branch should parse automatically
    expect(operationContent).toContain("parsed: parseResult");

    // Manual validation branch should provide parse method
    expect(operationContent).toContain("parse: () =>");
  });
});
