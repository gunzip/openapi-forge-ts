# Template Management Infrastructure

This directory contains the centralized template management system for the TypeScript OpenAPI Client Generator. The infrastructure provides coordinated template rendering, shared utilities, and consistent patterns across all template modules.

## Architecture Overview

### Core Files

- **`index.ts`** - Main template coordination module and registry
- **`template-types.ts`** - Shared TypeScript interfaces and type definitions
- **`template-utils.ts`** - Shared utility functions for code generation
- **Individual template modules** - Specialized rendering functions for different aspects

### Template Registry

All template functions are organized in a central registry:

```typescript
import { TEMPLATE_REGISTRY } from './templates/index.js';

// Access specific template categories
const configTemplates = TEMPLATE_REGISTRY.config;
const responseTemplates = TEMPLATE_REGISTRY.response;

// Get all template functions
const allFunctions = getAllTemplateFunctions();
```

## Shared Utilities

### Code Generation Utilities

The `template-utils.ts` module provides standardized functions for common code generation tasks:

```typescript
import {
  renderFunctionDeclaration,
  renderTypeDeclaration,
  renderInterfaceDeclaration,
  renderUnionType,
  createIndentation,
  indentLines,
} from './template-utils.js';

// Generate a TypeScript function
const functionCode = renderFunctionDeclaration({
  functionName: 'fetchUser',
  parameters: 'id: string',
  returnType: 'Promise<User>',
  body: 'return await fetch(`/users/${id}`).then(r => r.json());',
  exportKeyword: true,
  isAsync: true,
});

// Generate a TypeScript type
const typeCode = renderTypeDeclaration({
  typeName: 'ApiResponse',
  typeDefinition: 'Success | Error',
  exportKeyword: true,
});

// Generate a TypeScript interface
const interfaceCode = renderInterfaceDeclaration({
  interfaceName: 'User',
  properties: [
    { name: 'id', type: 'string', readonly: true },
    { name: 'name', type: 'string', optional: true },
  ],
  exportKeyword: true,
});
```

### Template Validation

Built-in validation helps ensure template quality:

```typescript
import { validateTemplate, createTemplateContext } from './template-utils.js';

// Validate a template string
const validation = validateTemplate(templateString, 'myTemplate');
if (!validation.isValid) {
  console.error('Template errors:', validation.errors);
}

// Create error-handling context for template functions
const safeTemplate = createTemplateContext(myTemplateFunction, 'myTemplate');
```

### Module Composition

Combine multiple templates into cohesive modules:

```typescript
import { renderModule, combineTemplates } from './template-utils.js';

const moduleCode = renderModule(
  [configTemplate, operationTemplate, utilityTemplate],
  {
    moduleHeader: '/* Generated API Client */',
    imports: ['import { z } from "zod";'],
    exports: ['export { apiClient };'],
  }
);
```

## Template Types

### Standard Interfaces

All template functions should follow these standard interfaces:

```typescript
// Basic template function
type TemplateFunction<TInput, TOutput = string> = (
  input: TInput, 
  config?: TemplateRenderConfig
) => TOutput;

// Configuration for rendering
interface TemplateRenderConfig {
  indentLevel?: number;
  useSpaces?: boolean;
  spacesPerIndent?: number;
}

// TypeScript-specific configuration
interface TypeScriptCodeConfig extends TemplateRenderConfig {
  exportKeyword?: boolean;
  constKeyword?: boolean;
  readonly?: boolean;
}
```

### Function Declaration Config

For generating TypeScript functions:

```typescript
interface FunctionDeclarationConfig extends TypeScriptCodeConfig {
  functionName: string;
  parameters: string;
  returnType?: string;
  isAsync?: boolean;
  genericParams?: string;
  body: string;
  summary?: string;
}
```

## Migration Guide

### Updating Existing Templates

To update existing template modules to use the centralized utilities:

1. **Import shared utilities:**
   ```typescript
   import { renderUnionType, indentLines } from './template-utils.js';
   ```

2. **Replace custom implementations:**
   ```typescript
   // Before
   export function renderUnionType(types: string[]): string {
     return types.join(' | ');
   }

   // After
   export function renderUnionType(types: string[]): string {
     return renderUnionTypeUtil(types); // Use centralized implementation
   }
   ```

3. **Use standardized formatting:**
   ```typescript
   // Before
   const code = `function ${name}() {\n  ${body}\n}`;

   // After
   const code = renderFunctionDeclaration({
     functionName: name,
     parameters: '',
     body: body,
   });
   ```

### Example Migration

Here's how the response-templates.ts module was updated:

```typescript
// Before
export function renderUnionType(unionTypes: string[]): string {
  return unionTypes.length > 0 ? unionTypes.join(" | ") : "never";
}

// After
import { renderUnionType as renderUnionTypeUtil } from './template-utils.js';

export function renderUnionType(
  unionTypes: string[],
  defaultType = "ApiResponse<number, unknown>",
): string {
  if (unionTypes.length === 0) {
    return defaultType;
  }
  return renderUnionTypeUtil(unionTypes); // Use centralized utility
}
```

## Testing

### Template Testing Utilities

The infrastructure includes comprehensive testing support:

```typescript
import { validateAllTemplates, getTemplateStats } from './templates/index.js';

// Validate all templates in the registry
const { results, overallValid } = validateAllTemplates();

// Get comprehensive statistics
const stats = getTemplateStats();
console.log(`Total templates: ${stats.totalTemplates}`);
console.log(`Categories: ${stats.categoriesCount}`);
```

### Test Structure

Tests are organized to cover:

- **Type definitions** (`template-types.test.ts`)
- **Utility functions** (`template-utils.test.ts`) 
- **Template coordination** (`template-index.test.ts`)
- **Individual template modules** (existing `*-templates.test.ts` files)

## Benefits

### Consistency
- Standardized code generation patterns
- Uniform indentation and formatting
- Consistent error handling

### Maintainability
- Centralized utility functions reduce duplication
- Shared type definitions ensure compatibility
- Template validation catches issues early

### Extensibility
- Easy to add new template utilities
- Template registry supports dynamic discovery
- Modular architecture supports incremental updates

## Usage Examples

### Basic Template Function

```typescript
import { TemplateFunction, TemplateRenderConfig } from './template-types.js';
import { indentLines } from './template-utils.js';

export const renderMyTemplate: TemplateFunction<MyInput> = (
  input: MyInput,
  config?: TemplateRenderConfig
): string => {
  const content = generateContent(input);
  return indentLines(content, config);
};
```

### Complex Template with Validation

```typescript
import { createTemplateContext, renderFunctionDeclaration } from './template-utils.js';

const renderComplexTemplate = (config: ComplexConfig): string => {
  return renderFunctionDeclaration({
    functionName: config.name,
    parameters: config.parameters.join(', '),
    returnType: config.returnType,
    body: config.implementation,
    exportKeyword: true,
    summary: config.documentation,
  });
};

// Create safe execution context
export const safeRenderComplexTemplate = createTemplateContext(
  renderComplexTemplate,
  'complex-template'
);
```

This infrastructure provides a solid foundation for consistent, maintainable template generation while preserving backward compatibility with existing code.