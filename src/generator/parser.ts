import { promises as fs } from "fs";
import yaml from "js-yaml";
import type { OpenAPIObject } from "openapi3-ts/oas31";

export async function parseOpenAPI(filePath: string): Promise<OpenAPIObject> {
  const fileContent = await fs.readFile(filePath, "utf-8");
  const extension = filePath.split(".").pop()?.toLowerCase();

  if (extension === "yaml" || extension === "yml") {
    return yaml.load(fileContent) as OpenAPIObject;
  }

  if (extension === "json") {
    return JSON.parse(fileContent) as OpenAPIObject;
  }

  throw new Error(`Unsupported file extension: ${extension}`);
}
