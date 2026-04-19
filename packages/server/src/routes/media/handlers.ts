import type { FastifyRequest, FastifyReply } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MediaService } from "./media.service.js";

const mediaService = new MediaService();

// Allowed MIME types for upload
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
]);

// Maximum file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function listMediaHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const items = await mediaService.list();
  reply.code(200).send(items);
}

export async function uploadMediaHandler(
  request: FastifyRequest & { file?: () => Promise<MultipartFile | undefined> },
  reply: FastifyReply,
): Promise<void> {
  let data: MultipartFile | undefined;

  try {
    // @ts-expect-error file() is added by @fastify/multipart plugin

    data = await request.file();
  } catch {
    return reply.code(400).send({
      code: "rest_missing_file",
      message: "No file provided",
      data: { status: 400 },
    });
  }

  if (!data) {
    return reply.code(400).send({
      code: "rest_missing_file",
      message: "No file provided",
      data: { status: 400 },
    });
  }

  const mimetype = data.mimetype;
  const filename = data.filename;

  if (!ALLOWED_MIME_TYPES.has(mimetype)) {
    return reply.code(400).send({
      code: "rest_invalid_media_type",
      message: `Media type not allowed: ${mimetype}. Allowed types: image/jpeg, image/png, image/gif, image/webp, application/pdf`,
      data: { status: 400 },
    });
  }

  const chunks: Buffer[] = [];
  let totalSize = 0;

  for await (const chunk of data.file) {
    totalSize += chunk.length;
    if (totalSize > MAX_FILE_SIZE) {
      return reply.code(413).send({
        code: "rest_file_too_large",
        message: "File exceeds maximum size of 10MB",
        data: { status: 413 },
      });
    }
    chunks.push(chunk);
  }

  const fileBuffer = Buffer.concat(chunks);

  try {
    const mediaItem = await mediaService.upload({
      filename,
      mimetype,
      data: fileBuffer,
    });

    return reply.code(201).send(mediaItem);
  } catch (e) {
    request.server.log.error(e);
    return reply.code(500).send({
      code: "rest_upload_failed",
      message: "Failed to upload file",
      data: { status: 500 },
    });
  }
}

export async function serveUploadedFileHandler(
  request: FastifyRequest<{ Params: { filename: string } }>,
  reply: FastifyReply,
): Promise<void> {
  const { filename } = request.params;

  // Prevent path traversal
  if (filename.includes("..") || filename.includes("/")) {
    return reply.code(404).send({
      code: "rest_file_not_found",
      message: "File not found",
      data: { status: 404 },
    });
  }

  const uploadDir = resolve(process.cwd(), "uploads");
  const filePath = resolve(uploadDir, filename);

  // Ensure the resolved path is still within uploadDir
  if (!filePath.startsWith(uploadDir)) {
    return reply.code(404).send({
      code: "rest_file_not_found",
      message: "File not found",
      data: { status: 404 },
    });
  }

  if (!existsSync(filePath)) {
    return reply.code(404).send({
      code: "rest_file_not_found",
      message: "File not found",
      data: { status: 404 },
    });
  }

  try {
    const data = readFileSync(filePath);
    // Guess MIME type from filename
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
    };
    const contentType = mimeMap[ext || ""] || "application/octet-stream";
    reply.type(contentType).send(data);
  } catch (e) {
    request.server.log.error(e);
    return reply.code(500).send({
      code: "rest_file_error",
      message: "Error reading file",
      data: { status: 500 },
    });
  }
}
