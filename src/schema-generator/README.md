# Schema Generator Module

This module provides OpenAPI schema to Zod conversion functionality, organized into focused, single-purpose modules.

## Module Structure

### Core Conversion

- **`schema-converter.ts`** - Main conversion orchestrator
  - `zodSchemaToCode()` - Main conversion function
  - Types: `ZodSchemaResult`, `ZodSchemaCodeOptions`, `OpenAPISchema`

### Specialized Handlers

- **`primitive-types.ts`** - Primitive type conversion (string, number, boolean, array)
  - `handleStringType()`, `handleNumberType()`, `handleBooleanType()`, `handleArrayType()`

- **`object-types.ts`** - Object type handling
  - `handleObjectType()` - Object properties and additional properties

- **`union-types.ts`** - Union and composition schemas
  - `handleAllOfSchema()`, `handleUnionSchema()`
  - Types: `UnionType`, `DiscriminatorConfig`

- **`enum-handlers.ts`** - Enum and extensible enum handling
  - `handleExtensibleEnum()`, `handleRegularEnum()`
  - Types: `ExtensibleEnumResult`

- **`reference-handlers.ts`** - $ref reference resolution
  - `handleReference()`

### File Generation

- **`file-generators.ts`** - Schema file generation
  - `generateSchemaFile()`, `generateRequestSchemaFile()`, `generateResponseSchemaFile()`
  - Types: `SchemaFileResult`

### Utilities

- **`utils.ts`** - Utility functions and type guards
  - `isSchemaObject()`, `inferEffectiveType()`, `addDefaultValue()`, etc.
  - Types: `EffectiveType`

### Public API

- **`index.ts`** - Main public API exports (single barrel file)

## Design Principles

1. **Single Responsibility** - Each module has a clear, focused purpose
2. **No Catchall Types** - Types are defined where they're used
3. **Minimal Circular Dependencies** - Uses local type definitions to avoid cycles
4. **Clear Export Structure** - Main exports vs advanced/utility exports
5. **Backward Compatibility** - All existing imports continue to work

## Usage

```typescript
// Main usage - import from the module index
import { zodSchemaToCode, generateSchemaFile } from "./schema-generator";

// Advanced usage with specific handlers
import { handleStringType, handleUnionSchema } from "./schema-generator";

// Type-only imports
import type { ZodSchemaResult, SchemaFileResult } from "./schema-generator";
```
