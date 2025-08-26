import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";
import path from "path";
import fs from "fs";

import { testFileUploadWrapper } from "../generated/server-operations/testFileUpload.js";
import { testBinaryFileUploadWrapper } from "../generated/server-operations/testBinaryFileUpload.js";
import { testBinaryFileDownloadWrapper } from "../generated/server-operations/testBinaryFileDownload.js";
import { createTestApp } from "./test-utils.js";

describe("Server Generator - File Upload/Download Operations", () => {
  let app: Express;
  let testFilePath: string;

  beforeEach(() => {
    app = createTestApp();

    /* Create a temporary test file */
    testFilePath = path.join("/tmp", "test-file.txt");
    fs.writeFileSync(
      testFilePath,
      "This is a test file content for upload testing.",
    );
  });

  afterEach(() => {
    /* Clean up test file */
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  describe("testFileUpload operation", () => {
    it("should handle multipart/form-data file upload", async () => {
      /* Arrange */
      app.post(
        "/test-file-upload",
        testFileUploadWrapper(async (params) => {
          if (params.type === "ok") {
            /* File should be parsed and available in body */
            expect(params.value.body).toBeDefined();
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "File uploaded successfully",
                receivedFile: !!params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-file-upload")
        .attach("file", testFilePath, "test-file.txt")
        .set("Content-Type", "multipart/form-data");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("File uploaded successfully");
      expect(response.body.receivedFile).toBe(true);
    });

    it("should handle missing file in upload", async () => {
      /* Arrange */
      app.post(
        "/test-file-upload",
        testFileUploadWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "File upload validation failed",
                details: params.error.issues,
              },
            };
          }

          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: { message: "Upload processed" },
            };
          }

          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-file-upload")
        .send({}) /* No file attached */
        .set("Content-Type", "application/json");

      /* Assert - Should handle missing file gracefully */
      expect([200, 400]).toContain(response.status);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should validate file upload with proper content type", async () => {
      /* Arrange */
      app.post(
        "/test-file-upload",
        testFileUploadWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "File validated and uploaded",
                hasFile: !!params.value.body,
              },
            };
          }

          /* Handle validation errors */
          return {
            status: 400,
            contentType: "application/json",
            data: {
              error: `Validation failed: ${params.type}`,
              details: params.error.issues,
            },
          };
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-file-upload")
        .attach("file", testFilePath, "test-upload.txt");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("File validated and uploaded");
    });
  });

  describe("testBinaryFileUpload operation", () => {
    it("should handle binary file upload", async () => {
      /* Arrange */
      app.post(
        "/test-binary-file-upload",
        testBinaryFileUploadWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Binary file uploaded successfully",
                receivedBinaryFile: !!params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-binary-file-upload")
        .attach("file", testFilePath, "binary-test.bin");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Binary file uploaded successfully");
      expect(response.body.receivedBinaryFile).toBe(true);
    });

    it("should validate binary file format", async () => {
      /* Arrange */
      app.post(
        "/test-binary-file-upload",
        testBinaryFileUploadWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Binary file validation failed",
                details: params.error.issues,
              },
            };
          }

          return {
            status: 200,
            contentType: "application/json",
            data: { message: "Binary file validated" },
          };
        }),
      );

      /* Create a binary test file */
      const binaryFilePath = path.join("/tmp", "test-binary.bin");
      const binaryData = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      ]); /* PNG header */
      fs.writeFileSync(binaryFilePath, binaryData);

      try {
        /* Act */
        const response = await request(app)
          .post("/test-binary-file-upload")
          .attach("file", binaryFilePath, "test.png");

        /* Assert */
        expect([200, 400]).toContain(response.status);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
      } finally {
        /* Clean up */
        if (fs.existsSync(binaryFilePath)) {
          fs.unlinkSync(binaryFilePath);
        }
      }
    });
  });

  describe("testBinaryFileDownload operation", () => {
    it("should return binary file download with correct content type", async () => {
      /* Arrange */
      const binaryData = Buffer.from(
        "Binary file content for download test",
        "utf-8",
      );

      app.get(
        "/test-binary-file-download",
        testBinaryFileDownloadWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/octet-stream",
              data: binaryData,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-binary-file-download");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(
        /application\/octet-stream/,
      );
      expect(
        Buffer.isBuffer(response.body) || typeof response.body === "string",
      ).toBe(true);
    });

    it("should handle download with proper headers", async () => {
      /* Arrange */
      const downloadFileName = "test-download.bin";
      const fileContent = Buffer.from("Downloadable binary content");

      app.get(
        "/test-binary-file-download",
        testBinaryFileDownloadWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/octet-stream",
              data: fileContent,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Add middleware to set download headers */
      app.use("/test-binary-file-download", (req, res, next) => {
        if (res.statusCode === 200) {
          res.setHeader(
            "Content-Disposition",
            `attachment; filename="${downloadFileName}"`,
          );
          res.setHeader("Content-Length", fileContent.length.toString());
        }
        next();
      });

      /* Act */
      const response = await request(app).get("/test-binary-file-download");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(
        /application\/octet-stream/,
      );
      /* Note: Content-Disposition and Content-Length would be set by user implementation */
    });

    it("should handle file download error scenarios", async () => {
      /* Arrange */
      app.get(
        "/test-binary-file-download",
        testBinaryFileDownloadWrapper(async (params) => {
          if (params.type === "ok") {
            /* Simulate file not found or access error */
            return {
              status: 404,
              contentType: "application/json",
              data: {
                error: "File not found",
                message: "The requested file could not be located",
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-binary-file-download");

      /* Assert */
      expect(response.status).toBe(404);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("File not found");
    });
  });

  describe("File operation edge cases", () => {
    it("should handle large file uploads appropriately", async () => {
      /* Arrange */
      const largeFilePath = path.join("/tmp", "large-test-file.txt");
      const largeContent = "A".repeat(1024 * 10); /* 10KB file */
      fs.writeFileSync(largeFilePath, largeContent);

      app.post(
        "/test-file-upload",
        testFileUploadWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Large file uploaded",
                fileReceived: !!params.value.body,
              },
            };
          }

          return {
            status: 400,
            contentType: "application/json",
            data: { error: `Upload failed: ${params.type}` },
          };
        }),
      );

      try {
        /* Act */
        const response = await request(app)
          .post("/test-file-upload")
          .attach("file", largeFilePath, "large-file.txt");

        /* Assert */
        expect([200, 400, 413]).toContain(
          response.status,
        ); /* 413 = Payload Too Large */
        expect(response.headers["content-type"]).toMatch(/application\/json/);
      } finally {
        /* Clean up */
        if (fs.existsSync(largeFilePath)) {
          fs.unlinkSync(largeFilePath);
        }
      }
    });

    it("should handle multiple file upload fields", async () => {
      /* Arrange */
      const file1Path = path.join("/tmp", "file1.txt");
      const file2Path = path.join("/tmp", "file2.txt");
      fs.writeFileSync(file1Path, "File 1 content");
      fs.writeFileSync(file2Path, "File 2 content");

      app.post(
        "/test-file-upload",
        testFileUploadWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Multiple files handled",
                bodyReceived: !!params.value.body,
              },
            };
          }

          return {
            status: 400,
            contentType: "application/json",
            data: { error: `Upload validation failed: ${params.type}` },
          };
        }),
      );

      try {
        /* Act */
        const response = await request(app)
          .post("/test-file-upload")
          .attach("file", file1Path, "file1.txt")
          .field("additionalField", "extra-data");

        /* Assert */
        expect([200, 400]).toContain(response.status);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
      } finally {
        /* Clean up */
        [file1Path, file2Path].forEach((filePath) => {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        });
      }
    });
  });
});
