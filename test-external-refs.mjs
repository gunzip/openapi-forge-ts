import { generate } from "./dist/generator/index.js";
import fs from "fs/promises";

async function testExternalRefResolution() {
  console.log("🧪 Testing external $ref resolution...");

  try {
    // Generate with external refs
    await generate({
      input: "test.yaml",
      output: "test-external-refs-output",
      generateClient: false,
    });

    // Check if Person and Book schemas were generated
    const personExists = await fs
      .access("test-external-refs-output/schemas/Person.ts")
      .then(() => true)
      .catch(() => false);
    const bookExists = await fs
      .access("test-external-refs-output/schemas/Book.ts")
      .then(() => true)
      .catch(() => false);

    if (personExists && bookExists) {
      console.log("✅ Person and Book schemas successfully generated!");

      // Read the Person schema to verify it contains the resolved address structure
      const personContent = await fs.readFile(
        "test-external-refs-output/schemas/Person.ts",
        "utf-8"
      );
      if (
        personContent.includes("zipCode: z.string().regex") &&
        personContent.includes("location: z.string()")
      ) {
        console.log(
          "✅ Person schema contains properly resolved Address and ZipCode references"
        );
      } else {
        console.log(
          "❌ Person schema does not contain expected resolved references"
        );
      }

      // Read the Book schema to verify it contains the nested resolved structure
      const bookContent = await fs.readFile(
        "test-external-refs-output/schemas/Book.ts",
        "utf-8"
      );
      if (
        bookContent.includes("isDead: z.boolean()") &&
        bookContent.includes("zipCode: z.string().regex")
      ) {
        console.log(
          "✅ Book schema contains properly resolved Author -> Person -> Address -> ZipCode chain"
        );
      } else {
        console.log(
          "❌ Book schema does not contain expected resolved nested references"
        );
      }
    } else {
      console.log("❌ Person or Book schemas were not generated");
      console.log(`Person exists: ${personExists}, Book exists: ${bookExists}`);
    }

    // Clean up
    await fs.rm("test-external-refs-output", { recursive: true, force: true });
    console.log("🧹 Cleaned up test output");
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testExternalRefResolution();
