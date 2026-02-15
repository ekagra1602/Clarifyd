"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { parseOffice } from "officeparser";

// Supported file extensions for parsing
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".txt", ".md"];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

// Parse uploaded file using officeparser (runs on server in Node.js runtime)
export const parseUploadedFile = action({
  args: {
    storageId: v.id("_storage"),
    fileName: v.string(),
  },
  handler: async (ctx, args): Promise<{ text: string; error?: string }> => {
    // Validate file extension
    const extension = args.fileName.toLowerCase().slice(args.fileName.lastIndexOf("."));
    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      return {
        text: "",
        error: `Unsupported file type "${extension}". Supported: ${SUPPORTED_EXTENSIONS.join(", ")}`,
      };
    }

    // Get file from storage
    const fileBlob = await ctx.storage.get(args.storageId);
    if (!fileBlob) {
      return { text: "", error: "File not found in storage" };
    }

    // Check file size
    if (fileBlob.size > MAX_FILE_SIZE) {
      return { text: "", error: `File exceeds 50MB limit (${Math.round(fileBlob.size / 1024 / 1024)}MB)` };
    }

    try {
      // Handle plain text files directly
      if (extension === ".txt" || extension === ".md") {
        const text = await fileBlob.text();
        return { text };
      }

      // Use officeparser for PDF, DOCX, PPTX
      const buffer = await fileBlob.arrayBuffer();
      const ast = await parseOffice(Buffer.from(buffer));

      // Convert AST to plain text
      const result = ast.toText();

      if (!result || result.trim().length === 0) {
        return {
          text: "",
          error: "No text content found (file may be scanned/image-only)",
        };
      }

      return { text: result };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return { text: "", error: `Failed to parse file: ${message}` };
    } finally {
      // Clean up storage after parsing
      await ctx.storage.delete(args.storageId);
    }
  },
});
