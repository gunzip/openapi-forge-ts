# GitHub Issues for Client Generator Refactoring

## Issue 1

**Title:** Refactor operation-function-generator.ts to separate orchestration logic from TypeScript code rendering

**Description:**
Currently, `operation-function-generator.ts` contains both the high-level orchestration logic for assembling operation metadata and the string templates for generating TypeScript code. The main `generateOperationFunction` function is responsible for both business logic (extracting parameters, resolving types, determining content maps) and code assembly (building function signatures, type aliases, and function bodies).

**Problems:**
- The 157-line function mixes metadata extraction with template string assembly
- Functions like `buildGenericParams`, `buildTypeAliases`, and `buildParameterDeclaration` contain hardcoded TypeScript syntax
- Business logic is tightly coupled with rendering, making unit testing difficult
- Code generation logic is not reusable for different output formats

**Proposed changes:**
- Create a new `templates/operation-templates.ts` module for all TypeScript rendering
- Extract orchestration logic into pure functions that return data structures
- Separate `generateOperationFunction` into:
  - `extractOperationMetadata()` - pure logic function that returns structured data
  - `renderOperationFunction()` - template rendering function that takes structured data
- Move helper functions like `buildGenericParams`, `buildTypeAliases` to template module
- Add comprehensive unit tests for the separated logic and rendering functions

**Files to be modified:**
- `src/client-generator/operation-function-generator.ts`
- Create `src/client-generator/templates/operation-templates.ts`
- Add tests for the separated functions

**Expected outcome:**
- Clear separation between business logic and rendering
- Improved testability of operation metadata extraction
- Reusable template functions for different contexts
- More maintainable and readable code structure

---

## Issue 2

**Title:** Extract TypeScript code generation from code-generation.ts into dedicated template modules

**Description:**
The `code-generation.ts` file contains the `generateFunctionBody` function and several helper functions that mix business logic for determining what code to generate with the actual TypeScript template strings. Functions like `generateHeadersContent`, `generateDynamicBodyContentCode` contain complex conditional logic alongside hardcoded code templates.

**Problems:**
- `generateFunctionBody` is a 128-line function that builds complex template strings inline
- `generateDynamicBodyContentCode` contains a hardcoded mapping of content types to code handlers
- Header generation logic is mixed with template assembly in `generateHeadersContent`
- The logic for determining what to generate is inseparable from how to generate it
- Templates are scattered throughout the function rather than centralized

**Proposed changes:**
- Create `templates/function-body-templates.ts` for all function body rendering
- Create `templates/content-type-templates.ts` for content type handling templates
- Extract logic functions:
  - `determineFunctionBodyStructure()` - decides what components are needed
  - `determineContentTypeHandlers()` - determines required content type handlers
  - `determineHeaderConfiguration()` - calculates header requirements
- Create template functions:
  - `renderFunctionBody()` - assembles the complete function body
  - `renderContentTypeSwitch()` - generates content type switch statements
  - `renderHeadersObject()` - generates headers object construction
- Move content type handler mappings to configuration objects
- Add unit tests for logic and template functions separately

**Files to be modified:**
- `src/client-generator/code-generation.ts`
- Create `src/client-generator/templates/function-body-templates.ts`
- Create `src/client-generator/templates/content-type-templates.ts`
- Add tests for separated functions

**Expected outcome:**
- Cleaner separation of business logic from template generation
- Configurable content type handlers instead of hardcoded mappings
- More testable code with isolated responsibilities
- Easier maintenance and extension of code generation logic

---

## Issue 3

**Title:** Separate parameter processing logic from TypeScript interface generation in parameters.ts

**Description:**
The `parameters.ts` file contains functions like `buildParameterInterface` and `buildDestructuredParameters` that combine parameter processing logic with TypeScript interface string generation. These functions contain complex conditional logic for determining parameter structure alongside template strings for TypeScript code.

**Problems:**
- `buildParameterInterface` (180+ lines) mixes parameter analysis with interface string building
- `buildDestructuredParameters` contains both parameter grouping logic and destructuring syntax
- Parameter processing logic cannot be tested independently of string generation
- Template strings for TypeScript interfaces are embedded within business logic
- Functions like `generateHeaderParamHandling` and `generateQueryParamHandling` mix logic with code generation

**Proposed changes:**
- Create `models/parameter-models.ts` for parameter data structures
- Create `templates/parameter-templates.ts` for all parameter-related rendering
- Extract pure logic functions:
  - `analyzeParameterStructure()` - determines parameter organization and requirements
  - `processParameterGroups()` - already exists but enhance to be purely logical
  - `determineParameterOptionalityRules()` - calculates which parameters are optional
- Create template functions:
  - `renderParameterInterface()` - generates TypeScript interface strings
  - `renderDestructuredParameters()` - generates function parameter destructuring
  - `renderParameterHandling()` - generates runtime parameter processing code
- Move parameter processing helper functions to logic module
- Add comprehensive unit tests for parameter analysis and rendering separately

**Files to be modified:**
- `src/client-generator/parameters.ts`
- Create `src/client-generator/models/parameter-models.ts`
- Create `src/client-generator/templates/parameter-templates.ts`
- Add tests for separated logic and rendering functions

**Expected outcome:**
- Clear separation between parameter analysis and code generation
- Reusable parameter processing logic for different contexts
- Better testability of parameter handling rules
- More maintainable interface generation code

---

## Issue 4

**Title:** Refactor responses.ts to separate response analysis from TypeScript code generation

**Description:**
The `responses.ts` file contains `generateResponseHandlers` and `buildParseInfo` functions that mix response analysis logic with TypeScript code generation. The response handling logic for determining types, parsing strategies, and union types is tightly coupled with template string generation.

**Problems:**
- `generateResponseHandlers` (155 lines) combines response analysis with switch-case code generation
- `buildParseInfo` mixes schema resolution logic with parse expression generation
- Response type determination logic is embedded within code generation
- Union type building is coupled with TypeScript union syntax generation
- Content type detection logic is mixed with code template assembly

**Proposed changes:**
- Create `models/response-models.ts` for response analysis data structures
- Create `templates/response-templates.ts` for response-related rendering
- Extract pure analysis functions:
  - `analyzeResponseStructure()` - determines response types and parsing strategies
  - `determineParsingStrategy()` - decides how to parse each response type
  - `buildResponseTypeInfo()` - creates response metadata without code generation
- Create template functions:
  - `renderResponseHandlers()` - generates switch-case statements for responses
  - `renderParseExpression()` - generates response parsing code
  - `renderUnionType()` - generates TypeScript union type strings
- Separate content type analysis from code generation in `buildParseInfo`
- Add comprehensive unit tests for response analysis and rendering

**Files to be modified:**
- `src/client-generator/responses.ts`
- Create `src/client-generator/models/response-models.ts`
- Create `src/client-generator/templates/response-templates.ts`
- Add tests for separated analysis and rendering functions

**Expected outcome:**
- Independent testing of response analysis logic
- Reusable response type determination for different output formats
- Cleaner separation of concerns in response handling
- More maintainable union type and handler generation

---

## Issue 5

**Title:** Extract configuration template generation from config-generator.ts business logic

**Description:**
The `config-generator.ts` file contains `generateConfigTypes` function that combines configuration analysis (determining auth headers, server URLs, type structure) with TypeScript interface and implementation generation. The configuration logic is embedded within template string assembly.

**Problems:**
- `generateConfigTypes` mixes configuration analysis with TypeScript interface generation
- Auth header processing logic is coupled with type generation
- Server URL analysis is embedded within template string building
- The `STATIC_CONFIG_SUPPORT` constant contains complex TypeScript code as a template string
- Configuration structure determination cannot be tested independently

**Proposed changes:**
- Create `models/config-models.ts` for configuration data structures
- Create `templates/config-templates.ts` for configuration file rendering
- Extract pure logic functions:
  - `analyzeAuthConfiguration()` - determines auth header requirements and types
  - `analyzeServerConfiguration()` - processes server URL configuration
  - `determineConfigStructure()` - decides configuration interface structure
- Create template functions:
  - `renderConfigInterface()` - generates GlobalConfig interface
  - `renderConfigImplementation()` - generates default configuration object
  - `renderConfigSupport()` - generates support code (response types, utilities, error classes)
- Split `STATIC_CONFIG_SUPPORT` into smaller, focused template functions
- Add unit tests for configuration analysis and template rendering

**Files to be modified:**
- `src/client-generator/config-generator.ts`
- Create `src/client-generator/models/config-models.ts`
- Create `src/client-generator/templates/config-templates.ts`
- Add tests for separated configuration logic and rendering

**Expected outcome:**
- Independent testing of configuration analysis logic
- Modular template generation for different configuration aspects
- Better maintainability of complex support code templates
- Clearer separation between configuration logic and code generation

---

## Issue 6

**Title:** Separate security processing logic from code generation in security.ts

**Description:**
The `security.ts` file contains functions like `generateSecurityHeaderHandling` and `extractAuthHeaders` that mix security scheme analysis with code generation. The security processing logic is coupled with TypeScript code templates for header handling.

**Problems:**
- `generateSecurityHeaderHandling` combines security header analysis with code generation
- `extractAuthHeaders` contains business logic mixed with global vs operation-specific determination
- Security scheme processing cannot be tested independently of code generation
- Header handling logic is embedded within template generation

**Proposed changes:**
- Create `models/security-models.ts` for security-related data structures
- Create `templates/security-templates.ts` for security code rendering
- Extract pure logic functions:
  - `analyzeSecuritySchemes()` - processes security scheme requirements
  - `determineAuthHeaderRequirements()` - calculates required auth headers
  - `processOperationSecurity()` - analyzes operation-specific security requirements
- Create template functions:
  - `renderSecurityHeaderHandling()` - generates security header processing code
  - `renderAuthHeaderValidation()` - generates header validation code
- Separate global vs operation-specific security analysis from code generation
- Add unit tests for security analysis and rendering functions

**Files to be modified:**
- `src/client-generator/security.ts`
- Create `src/client-generator/models/security-models.ts`
- Create `src/client-generator/templates/security-templates.ts`
- Add tests for separated security logic and rendering

**Expected outcome:**
- Independent testing of security scheme processing
- Reusable security analysis for different contexts
- Cleaner separation of security logic from code generation
- More maintainable security header handling

---

## Issue 7

**Title:** Refactor request-body.ts to separate body analysis from code generation

**Description:**
The `request-body.ts` file contains functions like `generateRequestBodyHandling` that mix request body type analysis with TypeScript code generation. The content type determination logic is coupled with body handling code templates.

**Problems:**
- `generateRequestBodyHandling` contains hardcoded content type handlers mixed with generation logic
- Content type prioritization logic is embedded within code generation
- Request body type analysis cannot be tested independently
- Body handling strategies are coupled with specific code templates

**Proposed changes:**
- Create `models/request-body-models.ts` for request body data structures
- Create `templates/request-body-templates.ts` for body handling rendering
- Extract pure logic functions:
  - `analyzeRequestBodyStructure()` - determines body type and requirements
  - `determineContentTypeStrategy()` - selects appropriate content type handling
  - `prioritizeContentTypes()` - orders content types by preference
- Create template functions:
  - `renderBodyHandling()` - generates body processing code for each content type
  - `renderContentTypeHeaders()` - generates content type header code
- Move content type handler mapping to configuration objects
- Add unit tests for body analysis and rendering functions

**Files to be modified:**
- `src/client-generator/request-body.ts`
- Create `src/client-generator/models/request-body-models.ts`
- Create `src/client-generator/templates/request-body-templates.ts`
- Add tests for separated body analysis and rendering

**Expected outcome:**
- Independent testing of request body analysis logic
- Configurable content type handling strategies
- Cleaner separation of body processing logic from code generation
- More maintainable body handling code

---

## Issue 8

**Title:** Create centralized template management and rendering infrastructure

**Description:**
After separating business logic from rendering in individual modules, we need a centralized template management system to coordinate all the separated template functions and provide consistent rendering infrastructure.

**Problems:**
- No centralized coordination of template rendering across modules
- Lack of consistent template utility functions (indentation, code formatting, etc.)
- No shared template validation or testing infrastructure
- Template functions may have duplicated utility code

**Proposed changes:**
- Create `templates/index.ts` as the main template coordination module
- Create `templates/template-utils.ts` for shared template utilities:
  - Code indentation and formatting functions
  - Common TypeScript syntax helpers
  - Template validation utilities
- Create `templates/template-types.ts` for shared template data structures
- Establish consistent patterns for all template functions:
  - Standard input/output interfaces
  - Error handling for template generation
  - Consistent code formatting and indentation
- Create template testing utilities for consistent testing across all template modules
- Document template architecture and usage patterns

**Files to be created:**
- `src/client-generator/templates/index.ts`
- `src/client-generator/templates/template-utils.ts`
- `src/client-generator/templates/template-types.ts`
- Update all template modules to use centralized utilities
- Add comprehensive template integration tests

**Expected outcome:**
- Consistent template rendering across all modules
- Shared utilities reduce code duplication
- Better maintainability of template code
- Comprehensive testing infrastructure for templates
- Clear documentation of template architecture

---

## Issue 9

**Title:** Add comprehensive unit tests for separated business logic modules

**Description:**
After separating business logic from rendering code, we need comprehensive unit tests for all the extracted business logic functions to ensure they work correctly in isolation and provide better test coverage.

**Problems:**
- Current tests may be testing business logic and rendering together
- Extracted business logic functions need individual test coverage
- Need to ensure business logic functions are pure and deterministic
- Integration tests needed to verify logic and rendering work together

**Proposed changes:**
- Create test files for each separated logic module:
  - `tests/client-generator/models/parameter-models.test.ts`
  - `tests/client-generator/models/response-models.test.ts`
  - `tests/client-generator/models/config-models.test.ts`
  - `tests/client-generator/models/security-models.test.ts`
  - `tests/client-generator/models/request-body-models.test.ts`
- Create test files for template modules:
  - `tests/client-generator/templates/parameter-templates.test.ts`
  - `tests/client-generator/templates/response-templates.test.ts`
  - `tests/client-generator/templates/config-templates.test.ts`
  - `tests/client-generator/templates/security-templates.test.ts`
  - `tests/client-generator/templates/request-body-templates.test.ts`
- Follow established testing patterns:
  - Test behavior, not implementation
  - Use descriptive test names
  - Test edge cases and error handling
  - Keep tests simple and focused
- Add integration tests to verify end-to-end functionality
- Ensure all business logic functions are tested independently of rendering

**Files to be created:**
- Multiple test files for logic and template modules
- Integration test files for end-to-end verification
- Test utilities for common testing patterns

**Expected outcome:**
- Comprehensive test coverage for all separated components
- Independent verification of business logic correctness
- Better confidence in refactored code functionality
- Easier debugging and maintenance through isolated tests
- Clear documentation of expected behavior through tests

---

## Implementation Priority

The issues should be implemented in the following order to minimize disruption and ensure incremental progress:

1. **Issue 8** - Create template infrastructure first
2. **Issue 3** - Start with parameters (simpler, well-defined scope)
3. **Issue 7** - Request body handling (medium complexity)
4. **Issue 6** - Security processing (medium complexity)
5. **Issue 4** - Response handling (more complex)
6. **Issue 5** - Configuration generation (moderate complexity)
7. **Issue 2** - Code generation (complex, many dependencies)
8. **Issue 1** - Operation function generator (most complex, touches everything)
9. **Issue 9** - Comprehensive testing (after all separations are complete)

Each issue should be implemented as a complete, working change that doesn't break existing functionality, allowing for incremental progress and easier review.