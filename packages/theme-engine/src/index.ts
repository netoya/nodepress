/**
 * @nodepress/theme-engine — public entry point.
 *
 * This package currently exposes type contracts only. Runtime implementation
 * (template loader, resolver, renderer, asset pipeline) is scoped for
 * Sprint 3+ per ADR-011. See {@link ./types.js} for the declarative surface.
 */

export type {
  PostType,
  RenderContext,
  RenderData,
  Renderer,
  Template,
  TemplateMap,
  TemplateResolver,
  Theme,
} from "./types.js";
