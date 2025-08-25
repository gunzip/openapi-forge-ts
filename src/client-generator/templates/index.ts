/* Main template coordination module for TypeScript OpenAPI client generator */

/* Export all template modules */
export * as configTemplates from "./config-templates.js";
export * as contentTypeTemplates from "./content-type-templates.js";

export * as functionBodyTemplates from "./function-body-templates.js";
export * as operationTemplates from "./operation-templates.js";
export * as parameterTemplates from "./parameter-templates.js";
export * as requestBodyTemplates from "./request-body-templates.js";
export * as responseTemplates from "./response-templates.js";
export * as securityTemplates from "./security-templates.js";
/* Export all template types and utilities */
export type * from "./template-types.js";
export * from "./template-utils.js";

import type { TemplateValidationResult } from "./template-types.js";

/* Import template modules for internal coordination */
import * as configTemplates from "./config-templates.js";
import * as contentTypeTemplates from "./content-type-templates.js";
import * as functionBodyTemplates from "./function-body-templates.js";
import * as operationTemplates from "./operation-templates.js";
import * as parameterTemplates from "./parameter-templates.js";
import * as requestBodyTemplates from "./request-body-templates.js";
import * as responseTemplates from "./response-templates.js";
import * as securityTemplates from "./security-templates.js";
import { combineTemplates, validateTemplate } from "./template-utils.js";

/*
 * Central registry of all template functions
 */
export const TEMPLATE_REGISTRY = {
  config: configTemplates,
  contentType: contentTypeTemplates,
  functionBody: functionBodyTemplates,
  operation: operationTemplates,
  parameter: parameterTemplates,
  requestBody: requestBodyTemplates,
  response: responseTemplates,
  security: securityTemplates,
} as const;

/*
 * Template categories for organized access
 */
export type TemplateCategory = keyof typeof TEMPLATE_REGISTRY;

/*
 * Template execution statistics
 */
export type TemplateStats = {
  readonly categoriesCount: number;
  readonly totalTemplates: number;
  readonly validationResults: Record<string, TemplateValidationResult>;
};

/*
 * Creates a template execution context with error handling
 */
export function createTemplateContext<T>(
  templateFunction: (input: T) => string,
  templateName: string,
) {
  return (input: T): string => {
    try {
      const result = templateFunction(input);
      const validation = validateTemplate(result, templateName);

      if (!validation.isValid) {
        /* Log validation warnings and errors for debugging */
        if (validation.warnings.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(
            `Template validation warnings for ${templateName}:`,
            validation.warnings,
          );
        }
        if (validation.errors.length > 0) {
          // eslint-disable-next-line no-console
          console.error(
            `Template validation errors for ${templateName}:`,
            validation.errors,
          );
        }
      }

      return result;
    } catch (error) {
      const message = `Template execution failed for ${templateName}: ${error instanceof Error ? error.message : "Unknown error"}`;
      // eslint-disable-next-line no-console
      console.error(message);
      throw new Error(message);
    }
  };
}

/*
 * Utility function to get all available template functions
 */
export function getAllTemplateFunctions(): Record<string, unknown> {
  const allFunctions: Record<string, unknown> = {};

  for (const [categoryName, category] of Object.entries(TEMPLATE_REGISTRY)) {
    for (const [functionName, templateFunction] of Object.entries(category)) {
      const fullName = `${categoryName}.${functionName}`;
      allFunctions[fullName] = templateFunction;
    }
  }

  return allFunctions;
}

/*
 * Gets all template functions from a specific category
 */
export function getTemplateCategory(category: TemplateCategory): unknown {
  return TEMPLATE_REGISTRY[category];
}

/*
 * Gets comprehensive statistics about the template system
 */
export function getTemplateStats(): TemplateStats {
  const validation = validateAllTemplates();

  return {
    categoriesCount: Object.keys(TEMPLATE_REGISTRY).length,
    totalTemplates: Object.keys(getAllTemplateFunctions()).length,
    validationResults: validation.results,
  };
}

/*
 * Renders a complete module by combining multiple templates
 */
export function renderModule(
  templates: string[],
  options: {
    exports?: string[];
    imports?: string[];
    moduleFooter?: string;
    moduleHeader?: string;
  } = {},
): string {
  const parts: string[] = [];

  /* Add module header */
  if (options.moduleHeader) {
    parts.push(options.moduleHeader);
  }

  /* Add imports */
  if (options.imports?.length) {
    parts.push(...options.imports);
  }

  /* Add main template content */
  parts.push(combineTemplates(templates));

  /* Add exports */
  if (options.exports?.length) {
    parts.push(...options.exports);
  }

  /* Add module footer */
  if (options.moduleFooter) {
    parts.push(options.moduleFooter);
  }

  return combineTemplates(parts);
}

/*
 * Validates all templates in the registry
 */
export function validateAllTemplates(): {
  overallValid: boolean;
  results: Record<string, TemplateValidationResult>;
} {
  const results: Record<string, TemplateValidationResult> = {};
  let overallValid = true;

  for (const [categoryName, category] of Object.entries(TEMPLATE_REGISTRY)) {
    for (const [functionName, templateFunction] of Object.entries(category)) {
      if (typeof templateFunction === "function") {
        /* Generate a sample to validate template structure */
        try {
          const sample = templateFunction({});
          if (typeof sample === "string") {
            const templateName = `${categoryName}.${functionName}`;
            results[templateName] = validateTemplate(sample, templateName);
            if (!results[templateName].isValid) {
              overallValid = false;
            }
          }
        } catch (error) {
          const templateName = `${categoryName}.${functionName}`;
          results[templateName] = {
            errors: [
              `Template function error: ${error instanceof Error ? error.message : "Unknown error"}`,
            ],
            isValid: false,
            warnings: [],
          };
          overallValid = false;
        }
      }
    }
  }

  return { overallValid, results };
}
