# CLI Usage

The YanoGen-Ts CLI provides a powerful interface for generating TypeScript code from OpenAPI specifications.

## Basic Command

```bash
yanogen-ts generate [options]
```

## CLI Options

| Option | Description | Required | Default |
|--------|-------------|----------|---------|
| `-i, --input <path>` | Path to OpenAPI spec file (2.0, 3.0.x, or 3.1.x) in YAML or JSON format | ✅ | - |
| `-o, --output <path>` | Output directory for generated code | ✅ | - |
| `--generate-client` | Generate operation functions | ❌ | `false` |
| `--generate-server` | Generate server route wrappers | ❌ | `false` |
| `--force-validation` | Automatically validate responses with Zod | ❌ | `false` |

## Examples

### Generate Schemas Only

```bash
yanogen-ts generate \
  -i openapi.yaml \
  -o ./generated
```

This generates only the Zod schemas without client or server code.

### Generate Client

```bash
yanogen-ts generate \
  --generate-client \
  -i openapi.yaml \
  -o ./generated
```

### Generate Both Client and Server

```bash
yanogen-ts generate \
  --generate-client \
  --generate-server \
  -i openapi.yaml \
  -o ./generated
```

### With Automatic Validation

```bash
yanogen-ts generate \
  --generate-client \
  --force-validation \
  -i openapi.yaml \
  -o ./generated
```

### Remote OpenAPI Specification

```bash
yanogen-ts generate \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o ./generated
```

## Supported Input Formats

YanoGen-Ts automatically detects and converts different OpenAPI formats:

### OpenAPI Versions
- **OpenAPI 2.0** (Swagger) → automatically converted to 3.0 → 3.1
- **OpenAPI 3.0.x** → automatically converted to 3.1
- **OpenAPI 3.1.x** → used directly (no conversion needed)

### File Formats
- **YAML** files (`.yaml`, `.yml`)
- **JSON** files (`.json`)
- **Remote URLs** (automatically detected as YAML or JSON)

All input formats are automatically normalized to OpenAPI 3.1.0 before code generation.

## Watch Mode

For development, you can use file watching to automatically regenerate code when your OpenAPI spec changes:

```bash
# Install chokidar-cli globally first
npm install -g chokidar-cli

# Watch for changes and regenerate
chokidar-cli openapi.yaml -c \
  "yanogen-ts generate \
  --generate-client \
  --generate-server \
  -i openapi.yaml \
  -o generated"
```

## Generated Output Structure

When you run the CLI, it creates the following structure:

```
<output-dir>/
├── package.json                  # Generated package metadata
├── operations/                   # Client operations (if --generate-client)
│   ├── index.ts                  # Operation exports and configuration
│   ├── config.ts                 # Global configuration types
│   └── <operationId>.ts          # Individual operation functions
├── server/                       # Server wrappers (if --generate-server)
│   ├── index.ts                  # Server exports
│   └── <operationId>.ts          # Individual route wrappers
└── schemas/                      # Zod schemas
    ├── <SchemaName>.ts           # Individual schema files
    └── index.ts                  # Schema exports
```

## CLI Examples by Use Case

### Frontend Development
```bash
# Generate type-safe API client for frontend
yanogen-ts generate \
  --generate-client \
  -i backend-api.yaml \
  -o ./src/api
```

### Backend Development
```bash
# Generate server wrappers for type-safe routes
yanogen-ts generate \
  --generate-server \
  -i api-spec.yaml \
  -o ./src/generated
```

### Full-Stack Development
```bash
# Generate both client and server code
yanogen-ts generate \
  --generate-client \
  --generate-server \
  -i api-spec.yaml \
  -o ./shared/api
```

### Validation-Heavy Applications
```bash
# Generate with automatic response validation
yanogen-ts generate \
  --generate-client \
  --force-validation \
  -i api-spec.yaml \
  -o ./src/api
```

## Error Handling

The CLI provides clear error messages for common issues:

- **Invalid OpenAPI spec**: Detailed validation errors
- **File not found**: Clear path resolution messages
- **Network errors**: Helpful messages for remote URL issues
- **Generation errors**: Specific information about what failed

## Performance Notes

- **Fast generation**: Optimized for quick generation times, even with large specs
- **Concurrent processing**: Uses parallel processing for schema generation
- **Memory efficient**: Processes large specifications without excessive memory usage

## Next Steps

- Learn about [Client Generation](./client-generation) to use the generated client code
- Explore [Server Generation](./server-generation) for building type-safe servers
- Check out [Examples](./examples) for real-world usage patterns