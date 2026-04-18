# NodePress Plugins

Plugins in this directory are loaded by `loadPlugins()` from `@nodepress/core`.

## Hello World Plugin

Demonstrates the plugin activation contract:

```js
export default function myPlugin(hooks, context) {
  hooks.addFilter("the_content", {
    pluginId: "my-plugin",
    priority: 10,
    type: "filter",
    fn: (content) => content + " <!-- my plugin -->",
  });
}
```

Set `NODEPRESS_PLUGINS_DIR=./packages/plugins/hello-world` to activate this plugin.

## Plugin Activation Contract

Per ADR-020, a plugin module must:

1. **Export a default function** with signature:

   ```ts
   (hooks: HookRegistry, context: PluginContext) => void | Promise<void>
   ```

2. **Register hooks** synchronously or asynchronously via the `hooks` parameter.

3. **Handle errors** — if the plugin throws or times out (5 second limit),
   the loader logs the error and continues with the next plugin.

4. **Resource cleanup** — any resources the plugin creates (timers, open handles,
   caches) should be registered with `context.onDispose()` for automatic cleanup
   when the plugin is deactivated.
