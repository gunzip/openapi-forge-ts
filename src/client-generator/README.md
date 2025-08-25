# Client Generator Module

## Module Structure

### Core Types (`types.ts`)

Contains all TypeScript interfaces and type definitions used throughout the client generator.

### Utilities (`utils.ts`)

Helper functions for string manipulation, path generation, and content type detection.

### Parameter Handling (`parameters.ts`)

Functions for extracting, processing, and grouping OpenAPI parameters:

- Parameter reference resolution
- Parameter grouping by location (path, query, header)
- Parameter interface generation
- Destructured parameter signature building

### Response Handling (`responses.ts`)

Functions for processing OpenAPI responses:

- Response handler generation
- Return type determination using discriminated unions
- Content type detection

### Request Body Processing (`request-body.ts`)

Functions for handling request bodies:

- Content type selection and prioritization
- Type resolution for request bodies
- Request body code generation for different content types

### Security Handling (`security.ts`)

Functions for processing authentication and security:

- Global auth header extraction
- Operation-specific security scheme processing
- Security header generation

### Code Generation (`code-generation.ts`)

Core code generation utilities:

- Function body generation
- HTTP client code generation

### Configuration Generator (`config-generator.ts`)

Generates configuration files and types:

- Global configuration interface
- API response types
- Utility functions for response handling

### Templates (`templates/`)

Centralized template management and rendering infrastructure:

#### Template Coordination (`templates/index.ts`)

Main template coordination module that provides:

- Unified exports of all template functions and types
- Template module and function registry for validation
- Backward compatibility with existing template imports

#### Template Utilities (`templates/template-utils.ts`)

Shared utility functions for consistent code generation:

- **Code Indentation**: `createIndent()`, `indentCode()`, `dedentCode()` 
- **TypeScript Syntax Helpers**: `wrapInInterface()`, `wrapInTypeAlias()`, `wrapInFunction()`
- **Documentation**: `createJSDoc()` for consistent JSDoc comment generation
- **Validation**: `validateTypeScriptSyntax()`, `validateTemplateConfig()`
- **Formatting**: `formatGeneratedCode()`, `createDefaultRenderContext()`

#### Template Types (`templates/template-types.ts`)

Shared template data structures and interfaces:

- `TemplateRenderContext` - Configuration for template rendering
- `CodeFormattingOptions` - Options for code formatting and indentation
- `TypeScriptSyntaxOptions` - TypeScript syntax preferences
- `TemplateValidationResult` - Results from template validation
- `TemplateFunctionInfo` - Metadata for template functions

#### Operation Templates (`templates/operation-templates.ts`)

TypeScript rendering functions for operation code generation:

- `buildGenericParams()` - Creates generic parameter lists for content-type selection
- `buildParameterDeclaration()` - Generates function parameter declarations
- `buildTypeAliases()` - Emits request/response content-type map aliases
- `renderOperationFunction()` - Renders complete TypeScript operation functions

**Benefits of Centralized Template Infrastructure:**

- **Consistency**: All template functions use shared utilities for indentation and formatting
- **Maintainability**: Template utilities are centralized and well-tested
- **Validation**: Built-in TypeScript syntax validation and configuration validation
- **Testing**: Comprehensive test coverage with template testing utilities
- **Documentation**: Clear patterns and architectural guidelines

### Operation Extraction (`operation-extractor.ts`)

Functions for parsing OpenAPI documents:

- Base URL extraction
- Operation metadata extraction

### Operation Function Generator (`operation-function-generator.ts`)

Main function for generating individual operation functions:

- Combines all other modules to generate complete TypeScript functions

### File Writer (`file-writer.ts`)

File system operations:

- Individual operation file writing
- Configuration file writing
- Index file generation
- Directory creation

### Main Entry Point (`index.ts`)

Orchestrates the entire client generation process and provides the main public API.

## Usage

### Main API

The main entry point is `generateOperations()` function exported from `index.ts`:

```typescript
import { generateOperations } from "./client-generator/index.js";

await generateOperations(openApiDoc, outputDirectory);
```

### Template Usage Patterns

#### Using Template Utilities

```typescript
import { 
  indentCode, 
  wrapInFunction, 
  createJSDoc,
  validateTypeScriptSyntax,
  formatGeneratedCode 
} from "./client-generator/templates/index.js";

// Create indented code block
const body = indentCode("return response.data;", 1);

// Generate JSDoc comments
const jsdoc = createJSDoc(
  "Fetches user data",
  [{ name: "id", description: "User ID" }],
  "User object"
);

// Wrap in function with validation
const functionCode = wrapInFunction(
  "getUser",
  "id: string",
  "Promise<User>",
  body,
  { isAsync: true, jsdoc }
);

// Validate generated code
const validation = validateTypeScriptSyntax(functionCode);
if (!validation.isValid) {
  console.error("Validation errors:", validation.errors);
}

// Apply final formatting
const formatted = formatGeneratedCode(functionCode, {
  includeTrailingNewline: true,
  preserveEmptyLines: true
});
```

#### Using Operation Templates

```typescript
import { 
  renderOperationFunction,
  buildGenericParams,
  buildTypeAliases,
  type OperationFunctionRenderConfig 
} from "./client-generator/templates/index.js";

// Configure operation function rendering
const config: OperationFunctionRenderConfig = {
  functionName: "createUser",
  summary: "/** Creates a new user */\n",
  genericParams: "",
  parameterDeclaration: "{ body }: { body: User }",
  updatedReturnType: "ApiResponse<201, User>",
  functionBodyCode: "return fetchApi('/users', { method: 'POST', body });",
  typeAliases: "export type CreateUserRequest = User;\n\n"
};

// Generate complete operation function
const operationCode = renderOperationFunction(config);
```

#### Template Testing

```typescript
import { 
  validateTemplateConfig, 
  createDefaultRenderContext 
} from "./client-generator/templates/index.js";

// Create test render context
const context = createDefaultRenderContext({
  indentLevel: 2,
  syntax: { includeJSDoc: false }
});

// Validate configuration
const validation = validateTemplateConfig(context);
expect(validation.isValid).toBe(true);
```

This maintains the same API as the original monolithic module while providing a much cleaner internal structure and comprehensive template management capabilities.
