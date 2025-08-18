#!/usr/bin/env node

import { Command } from "commander";
import { generate } from "./generator/index.js";

const program = new Command();

program
  .name("openapi-ts-client-generator")
  .description(
    "Generate a TypeScript client from an OpenAPI 3.1.0 specification."
  )
  .version("1.0.0");

program
  .command("generate")
  .description("Generate the client.")
  .requiredOption(
    "-i, --input <path>",
    "Path to the OpenAPI specification file."
  )
  .requiredOption("-o, --output <path>", "Path to the output directory.")
  .option("--generate-client", "Generate the full HTTP client.", false)
  .option(
    "--validate-request",
    "Generate Zod schemas for request validation.",
    false
  )
  .option(
    "--loose-interfaces",
    "Generate loose interfaces for runtime checks.",
    false
  )
  .option(
    "--modular",
    "Generate each Zod schema and its corresponding type in its own file.",
    false
  )
  .action(async (options: Record<string, unknown>) => {
    try {
      await generate(options as any);
      console.log("✅ Client generated successfully!");
    } catch (error) {
      console.error("❌ An error occurred during generation:", error);
      process.exit(1);
    }
  });

program.parse(process.argv);
