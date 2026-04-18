# NodePress Plugin API

> Based on ADR-012 (Plugin API) and ADR-020 (Plugin Loader Runtime).

## Overview

NodePress plugins are JavaScript/TypeScript modules that register hooks into the
HookRegistry. Plugins are loaded from a configurable directory at server startup.

## Activation Contract

Every plugin must export a default function:

```typescript
import type { HookRegistry, PluginContext } from "@nodepress/core";

export default function myPlugin(
  hooks: HookRegistry,
  context: PluginContext,
): void | Promise<void> {
  // register hooks here
}
```

## Available Hooks

### Filters (return modified value)

| Hook          | Arguments                       | Description                               |
| ------------- | ------------------------------- | ----------------------------------------- |
| `the_content` | `(content: string, post: Post)` | Filter post HTML content before rendering |
| `the_title`   | `(title: string, post: Post)`   | Filter post title                         |
| `the_excerpt` | `(excerpt: string, post: Post)` | Filter post excerpt                       |

### Actions (side effects)

| Hook            | Arguments           | Description                |
| --------------- | ------------------- | -------------------------- |
| `pre_save_post` | `(post: PostInput)` | Before post is saved to DB |
| `save_post`     | `(post: Post)`      | After post is saved to DB  |

## Configuration

Set the plugins directory via environment variable:

```bash
NODEPRESS_PLUGINS_DIR=./plugins  # default
```

Each `.js` file in the directory is loaded as a plugin.

## Example Plugin

See `packages/plugins/hello-world/index.js` for a working example.

## Sandbox

Plugins run with a 5-second timeout guard (ADR-020). If a plugin hangs or
throws during activation, the error is logged and the server continues.
