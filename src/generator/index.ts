import { promises as fs } from "fs";
import path from "path";
import type { SchemaObject } from "openapi3-ts/oas31";
import { parseOpenAPI } from "./parser.js";
import { zodSchemaToCode } from "./zod-schema-generator.js";
import { generateClient } from "./client-generator.js";
import { format } from "prettier";

export interface GenerationOptions {
  input: string;
  output: string;
  generateClient: boolean;
  validateRequest: boolean;
  looseInterfaces: boolean;
  modular: boolean;
}

export async function generate(options: GenerationOptions): Promise<void> {
  const {
    input,
    output,
    modular,
    generateClient: genClient,
    looseInterfaces,
  } = options;

  await fs.mkdir(output, { recursive: true });

  const openApiDoc = await parseOpenAPI(input);

  if (openApiDoc.components?.schemas) {
    const schemasDir = modular ? path.join(output, "schemas") : output;
    if (modular) {
      await fs.mkdir(schemasDir, { recursive: true });
    }

    let allSchemasContent = `import { z } from 'zod';\n\n`;
    let allTypesContent = "";

    function isPlainSchemaObject(obj: any): obj is SchemaObject {
      // Must be a plain object, not a Zod object, and not null
      if (!obj || typeof obj !== "object") return false;
      if (typeof obj.safeParse === "function" || obj._def) return false; // Zod instance
      // Must have at least one OpenAPI schema property
      return (
        "type" in obj ||
        "allOf" in obj ||
        "anyOf" in obj ||
        "oneOf" in obj ||
        "properties" in obj
      );
    }

    for (const [name, schema] of Object.entries(
      openApiDoc.components.schemas
    )) {
      const schemaVar = `${name}`;
      const schemaContent = `export const ${schemaVar} = ${zodSchemaToCode(schema)};`;
      const typeContent = `export type ${name} = z.infer<typeof ${schemaVar}>;`;
      if (!isPlainSchemaObject(schema)) {
        console.warn(
          `⚠️ Skipping ${name}: not a plain OpenAPI schema object. Value:`,
          schema
        );
        continue;
      }

      // No longer generating separate .type.ts files; type is exported from schema file

      if (modular) {
        const filePath = path.join(schemasDir, `${name}.ts`);
        const formattedContent = await format(
          `import { z } from 'zod';\n\n${schemaContent}`,
          {
            parser: "typescript",
          }
        );
        await fs.writeFile(filePath, formattedContent);
      } else {
        allSchemasContent += `${schemaContent}\n\n`;
      }
    }

    if (!modular) {
      const filePath = path.join(schemasDir, "schemas.ts");
      const formattedContent = await format(allSchemasContent, {
        parser: "typescript",
      });
      await fs.writeFile(filePath, formattedContent);

      if (looseInterfaces) {
        const typePath = path.join(schemasDir, "types.ts");
        const formattedContent = await format(allTypesContent, {
          parser: "typescript",
        });
        await fs.writeFile(typePath, formattedContent);
      }
    }
  }

  if (genClient) {
    const clientContent = await generateClient(openApiDoc);
    const clientPath = path.join(output, "client.ts");
    await fs.writeFile(clientPath, clientContent);
  }

  const packageJsonContent = {
    name: "generated-client",
    version: "1.0.0",
    type: "module",
    dependencies: {
      zod: "^3.0.0",
    },
  };
  const packageJsonPath = path.join(output, "package.json");
  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2)
  );
}
