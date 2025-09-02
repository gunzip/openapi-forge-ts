# Comparison with Alternative Libraries

After [evaluating several libraries](https://github.com/gunzip/openapi-generator-benchmark), we found that each has its [strengths and weaknesses](https://pagopa.github.io/dx/blog/typescript-openapi-generators-0.1-alpha), but ultimately, we chose to build this project to address specific needs and use cases.

Here is a comparison of the key features and limitations of each library.

| Feature / Limitation           |             yanogen-ts              |        openapi-codegen-ts        | openapi-zod-client |     openapi-ts     |
| ------------------------------ | :---------------------------------: | :------------------------------: | :----------------: | :----------------: |
| **Output structure**           |               Modular               |            Monolithic            |     Monolithic     |     Monolithic     |
| **Dependency footprint**       |         Minimal (Zod only)          | io-ts, @pagopa/ts-commons, fp-ts |  zodios + others   | Minimal (Zod only) |
| **Runtime validation**         |               Zod v4                |              io-ts               |       Zod v3       |       Zod v4       |
| **OpenAPI version support**    | 2.0, 3.0.x, 3.1.x (auto-normalized) |            2.0, 3.0.x            |    3.0.x, 3.1.x    |    3.0.x, 3.1.x    |
| **Error handling**             |           Strongly Typed            |        Typed, exhaustive         |       Basic        |       Basic        |
| **Generation Speed**           |               Faster                |        Slow on big specs         |        Fast        |        Fast        |
| **Schema Quality**             |              Very good              |            Very good             |       Loose        |        Good        |
| **Multiple success responses** |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **Multiple content types**     |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Security header support**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File download response**     |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **Tree-shaking friendly**      |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Per-operation overrides**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File upload support**        |                 ✅                  |                ✅                |         ✅         |         ✅         |
| **Server Validation**          |                 ✅                  |                ❌                |         ❌         |         ❌         |

## Alternative Libraries

- [openapi-zod-client](https://github.com/astahmer/openapi-zod-client)
- [openapi-codegen-ts](https://github.com/pagopa/openapi-codegen-ts)
- [openapi-ts](https://github.com/hey-api/openapi-ts)

## Key Differentiators

### Modular Architecture

Unlike monolithic generators that create single large files, YanoGen-Ts generates each operation and schema in its own file. This enables:

- **Tree Shaking**: Only bundle the operations you actually use
- **Better Performance**: Faster builds and smaller bundles
- **Maintainability**: Each operation in its own file for easier debugging
- **Testing**: Simple to mock individual operations

### Comprehensive OpenAPI Support

YanoGen-Ts automatically normalizes all OpenAPI versions (2.0, 3.0.x, 3.1.x) to OpenAPI 3.1.0, ensuring:

- **Consistent Output**: Same code structure regardless of input format
- **Future-Proof**: Always generates using the latest OpenAPI standard
- **Broad Compatibility**: Works with legacy Swagger 2.0 specs

### Flexible Validation Strategy

The opt-in validation approach provides unique advantages:

- **Performance Control**: Choose when to pay the validation cost
- **Real-World Resilience**: Handle APIs that don't strictly follow specs
- **Gradual Migration**: Add validation incrementally to existing codebases

### Type-Safe Error Handling

YanoGen-Ts provides discriminated union response types that enable:

- **Exhaustive Handling**: TypeScript ensures all response cases are handled
- **Strongly Typed Errors**: Known error responses are typed, unknown ones throw typed exceptions
- **Better DX**: IDE autocomplete and type checking for all response scenarios

## Conclusion

This project is designed with a clear focus on delivering an exceptional developer experience and robust type safety. Our core goals are to:

- **Eliminate runtime errors** by leveraging _strong_ TypeScript typing and comprehensive support for OpenAPI specs (ie. multiple response types).
- **Offer a developer experience similar to tRPC**, but fully driven by OpenAPI specifications—combining the best of both worlds: type safety and open standards (works with _external_ specs as well).
- **Generate high-quality, reusable schemas** for both API requests and responses, ensuring consistency across your codebase.

During our research, we discovered that many existing tools either lacked flexibility or forced developers into rigid workflows. By emphasizing modularity, type safety, and ease of integration, this project aims to bridge those gaps—empowering TypeScript developers to build reliable, maintainable APIs with confidence.