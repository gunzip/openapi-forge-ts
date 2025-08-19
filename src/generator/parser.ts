import { promises as fs } from "fs";
import yaml from "js-yaml";
import type { OpenAPIObject } from "openapi3-ts/oas31";
import { convertOpenAPI30to31, isOpenAPI30, isOpenAPI31 } from "./converter.js";

export async function parseOpenAPI(filePath: string): Promise<OpenAPIObject> {
  const fileContent = await fs.readFile(filePath, "utf-8");
  const extension = filePath.split(".").pop()?.toLowerCase();

  let parsed: any;

  if (extension === "yaml" || extension === "yml") {
    parsed = yaml.load(fileContent);
  } else if (extension === "json") {
    parsed = JSON.parse(fileContent);
  } else {
    throw new Error(`Unsupported file extension: ${extension}`);
  }

  // Check if we need to convert from OpenAPI 3.0 to 3.1
  if (isOpenAPI30(parsed)) {
    console.log(
      "🔄 Detected OpenAPI 3.0.x specification, converting to 3.1.0..."
    );
    parsed = convertOpenAPI30to31(parsed);
    console.log("✅ Successfully converted to OpenAPI 3.1.0");
  } else if (isOpenAPI31(parsed)) {
    console.log(
      "✅ OpenAPI 3.1.x specification detected, no conversion needed"
    );
  } else {
    console.warn("⚠️ Unknown OpenAPI version, proceeding without conversion");
  }

  return parsed as OpenAPIObject;
}
