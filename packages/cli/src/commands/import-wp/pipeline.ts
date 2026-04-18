/**
 * Import pipeline: parses WXR, normalizes, batches, writes to DB.
 */

import { existsSync, statSync } from "fs";
import { parseWxrStream } from "./sax-stream.js";
import {
  normalizeWxrPost,
  normalizeWxrTerm,
  normalizeWxrUser,
  normalizeWxrComment,
} from "./normalizer.js";
import { BatchWriter, type ImportStats } from "./batch-writer.js";
import type {
  WxrPost,
  WxrTerm,
  WxrUser,
  WxrComment,
  WxrParseResult,
} from "./wxr-types.js";

export interface ImportOptions {
  source: string;
  dryRun: boolean;
  mode: "upsert" | "reset";
  verbose?: boolean;
}

interface Progress {
  posts: number;
  terms: number;
  users: number;
  comments: number;
  attachments: number;
  customTypes: Set<string>;
  serializedPhp: number;
}

export async function runImport(options: ImportOptions): Promise<{
  result: WxrParseResult;
  stats: ImportStats;
}> {
  if (!existsSync(options.source)) {
    throw new Error(`File not found: ${options.source}`);
  }

  const fileStat = statSync(options.source);
  const fileSizeMb = (fileStat.size / (1024 * 1024)).toFixed(2);

  console.log("\nNodePress WP Import");
  console.log("───────────────────");
  console.log(`Source: ${options.source} (${fileSizeMb} MB)`);
  console.log(`Mode: ${options.mode}`);
  console.log(`Dry run: ${options.dryRun}`);
  console.log("");

  const progress: Progress = {
    posts: 0,
    terms: 0,
    users: 0,
    comments: 0,
    attachments: 0,
    customTypes: new Set(),
    serializedPhp: 0,
  };

  const writer = new BatchWriter(options.dryRun);

  console.log("Parsing...");

  return new Promise((resolve, reject) => {
    const parseResult: WxrParseResult = {
      posts: [],
      terms: [],
      users: [],
      comments: [],
      skipped: {
        attachments: 0,
        customPostTypes: new Set(),
        meta: new Map(),
        serializedPhp: 0,
        themeSettings: 0,
      },
    };

    const handlers = {
      onPost: (post: WxrPost) => {
        parseResult.posts.push(post);
        progress.posts++;
        if (progress.posts % 100 === 0) {
          process.stderr.write(`\r  Posts: ${progress.posts}`);
        }
      },

      onTerm: (term: WxrTerm) => {
        parseResult.terms.push(term);
        progress.terms++;
        if (progress.terms % 50 === 0) {
          process.stderr.write(`\r  Terms: ${progress.terms}`);
        }
      },

      onUser: (user: WxrUser) => {
        parseResult.users.push(user);
        progress.users++;
      },

      onComment: (comment: WxrComment) => {
        parseResult.comments.push(comment);
        progress.comments++;
        if (progress.comments % 500 === 0) {
          process.stderr.write(`\r  Comments: ${progress.comments}`);
        }
      },

      onSkipAttachment: () => {
        progress.attachments++;
        parseResult.skipped.attachments++;
      },

      onSkipCustomType: (type: string) => {
        progress.customTypes.add(type);
        parseResult.skipped.customPostTypes.add(type);
      },

      onSkipMeta: () => {
        progress.serializedPhp++;
      },

      onError: (err: Error) => {
        reject(err);
      },
    };

    parseWxrStream(options.source, handlers, async () => {
      process.stderr.write("\n");

      console.log(`  ✓ Found ${progress.posts} posts`);
      console.log(
        `  ✓ Found ${progress.terms} terms (${getCategoryCount(parseResult.terms)} categories, ${getTagCount(parseResult.terms)} tags)`,
      );
      console.log(`  ✓ Found ${progress.users} authors`);
      console.log(`  ✓ Found ${progress.comments} comments`);

      if (progress.attachments > 0) {
        console.log(
          `  ⚠ Skipped: ${progress.attachments} attachments (media not supported)`,
        );
      }
      if (progress.customTypes.size > 0) {
        console.log(
          `  ⚠ Skipped: ${progress.customTypes.size} custom post types`,
        );
      }

      console.log("\nImporting...");

      try {
        for (const user of parseResult.users) {
          const normalized = normalizeWxrUser(user);
          writer.addUser(normalized as never);
        }

        await writer.flush();

        for (const post of parseResult.posts) {
          const normalized = normalizeWxrPost(post);
          writer.addPost(normalized as never);
        }

        await writer.flush();

        for (const term of parseResult.terms) {
          const normalized = normalizeWxrTerm(term);
          writer.addTerm(normalized as never);
        }

        await writer.flush();

        for (const comment of parseResult.comments) {
          if (parseResult.posts.find((p) => p.wpPostId === comment.postWpId)) {
            const normalized = normalizeWxrComment(comment, 0);
            writer.addComment(normalized as never);
          }
        }

        await writer.flush();

        const stats = writer.getStats();

        if (options.dryRun) {
          console.log("  (dry-run, no DB writes)");
        } else {
          console.log(
            `  ✓ Users: ${stats.usersInserted} imported, ${stats.usersSkipped} skipped`,
          );
          console.log(
            `  ✓ Posts: ${stats.postsInserted} imported, ${stats.postsSkipped} skipped`,
          );
          console.log(
            `  ✓ Terms: ${stats.termsInserted} imported, ${stats.termsSkipped} skipped`,
          );
          console.log(
            `  ✓ Comments: ${stats.commentsInserted} imported, ${stats.commentsSkipped} skipped`,
          );
        }

        if (progress.attachments > 0) {
          console.log(
            `  ⚠ Skipped: ${progress.attachments} attachments (media not supported in this version)`,
          );
        }

        const totalWritten =
          stats.postsInserted +
          stats.termsInserted +
          stats.usersInserted +
          stats.commentsInserted;

        if (!options.dryRun) {
          console.log(`\nImport complete. ${totalWritten} records written.`);
        } else {
          console.log(
            `\nDry-run complete. Would have written ~${totalWritten} records.`,
          );
        }

        resolve({ result: parseResult, stats });
      } catch (err) {
        reject(err);
      }
    });
  });
}

function getCategoryCount(terms: WxrTerm[]): number {
  return terms.filter((t) => t.taxonomy === "category").length;
}

function getTagCount(terms: WxrTerm[]): number {
  return terms.filter((t) => t.taxonomy === "post_tag").length;
}
