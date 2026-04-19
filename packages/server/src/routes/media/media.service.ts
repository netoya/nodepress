import {
  existsSync,
  mkdirSync,
  writeFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { resolve } from "node:path";

export interface MediaItem {
  id: number;
  slug: string;
  title: string;
  filename: string;
  mimeType: string;
  filesize: number;
  url: string; // /wp-content/uploads/{filename}
  uploadedAt: Date;
}

export class MediaService {
  private items = new Map<number, MediaItem>();
  private nextId = 1;

  constructor(private uploadDir: string = resolve(process.cwd(), "uploads")) {
    // Ensure upload directory exists
    if (!existsSync(this.uploadDir)) {
      mkdirSync(this.uploadDir, { recursive: true });
    }

    // Load existing files from disk to rebuild ID counter
    this.loadExistingFiles();
  }

  private loadExistingFiles(): void {
    try {
      const files = readdirSync(this.uploadDir);
      for (const filename of files) {
        const filePath = resolve(this.uploadDir, filename);
        const stat = statSync(filePath);
        const id = this.nextId++;
        this.items.set(id, {
          id,
          slug: filename
            .replace(/\.[^.]+$/, "")
            .toLowerCase()
            .replace(/\s+/g, "-"),
          title: filename.replace(/\.[^.]+$/, ""),
          filename,
          mimeType: this.guessMimeType(filename),
          filesize: stat.size,
          url: `/wp-content/uploads/${filename}`,
          uploadedAt: stat.birthtime || stat.mtime || new Date(),
        });
      }
    } catch {
      // Directory empty or unreadable — that's fine
    }
  }

  private guessMimeType(filename: string): string {
    const ext = filename.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      pdf: "application/pdf",
    };
    return mimeMap[ext || ""] || "application/octet-stream";
  }

  async list(): Promise<MediaItem[]> {
    return Array.from(this.items.values()).sort(
      (a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime(),
    );
  }

  async upload(file: {
    filename: string;
    mimetype: string;
    data: Buffer;
  }): Promise<MediaItem> {
    const id = this.nextId++;
    const filename = `${id}-${file.filename}`;
    const filePath = resolve(this.uploadDir, filename);

    // Write file to disk
    writeFileSync(filePath, file.data);

    // Create media item
    const item: MediaItem = {
      id,
      slug: file.filename
        .replace(/\.[^.]+$/, "")
        .toLowerCase()
        .replace(/\s+/g, "-"),
      title: file.filename.replace(/\.[^.]+$/, ""),
      filename,
      mimeType: file.mimetype,
      filesize: file.data.length,
      url: `/wp-content/uploads/${filename}`,
      uploadedAt: new Date(),
    };

    this.items.set(id, item);
    return item;
  }
}
