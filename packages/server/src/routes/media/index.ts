import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import fastifyMultipart from "@fastify/multipart";
import {
  listMediaHandler,
  uploadMediaHandler,
  serveUploadedFileHandler,
} from "./handlers.js";

const MediaItemSchema = {
  type: "object",
  required: [
    "id",
    "slug",
    "title",
    "filename",
    "mimeType",
    "filesize",
    "url",
    "uploadedAt",
  ],
  properties: {
    id: { type: "integer" },
    slug: { type: "string" },
    title: { type: "string" },
    filename: { type: "string" },
    mimeType: { type: "string" },
    filesize: { type: "integer" },
    url: { type: "string" },
    uploadedAt: { type: "string", format: "date-time" },
  },
};

const ErrorResponseSchema = {
  type: "object",
  required: ["code", "message"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    data: { type: "object" },
  },
};

export default fp(async (app: FastifyInstance) => {
  // Register multipart plugin (only once)
  if (!app.hasDecorator("multipartErrors")) {
    await app.register(fastifyMultipart, {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    });
  }

  // GET /wp/v2/media — List media (public)
  app.get(
    "/wp/v2/media",
    {
      schema: {
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            per_page: {
              type: "integer",
              minimum: 1,
              maximum: 100,
              default: 10,
            },
          },
        },
        response: {
          200: {
            type: "array",
            items: MediaItemSchema,
          },
        },
      },
    },
    listMediaHandler,
  );

  // POST /wp/v2/media — Upload media (admin required)
  app.post(
    "/wp/v2/media",
    {
      preHandler: [app.requireAdmin],
      schema: {
        response: {
          201: MediaItemSchema,
          400: ErrorResponseSchema,
          401: ErrorResponseSchema,
          413: ErrorResponseSchema,
          500: ErrorResponseSchema,
        },
      },
    },
    uploadMediaHandler,
  );

  // GET /wp-content/uploads/:filename — Serve uploaded files
  app.get(
    "/wp-content/uploads/:filename",
    {
      schema: {
        params: {
          type: "object",
          required: ["filename"],
          properties: {
            filename: { type: "string" },
          },
        },
        response: {
          200: { type: "string" },
          404: ErrorResponseSchema,
        },
      },
    },
    serveUploadedFileHandler,
  );
});
