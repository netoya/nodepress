export default function helloWorldPlugin(hooks, context) {
  hooks.addFilter("the_content", {
    pluginId: "hello-world",
    priority: 10,
    type: "filter",
    fn: (content) => {
      return content + "\n<!-- Hello from NodePress Hello World Plugin! -->";
    },
  });
}
