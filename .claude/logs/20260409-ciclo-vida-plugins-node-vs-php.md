# Reunión: Ciclo de vida de plugins — Node.js persistente vs PHP stateless

**Fecha:** 2026-04-09
**Participantes:** Román (Tech Lead), Ingrid (Lead Backend), Raúl (Dev Backend)
**Duración estimada:** 40 minutos

---

## Preparación Individual

### Román (Tech Lead)
- 6 puntos de decisión: instalación, activación, cleanup, hot reload, estado, crash isolation
- Propuesta: plugins/ filesystem + DB, dynamic import(), PluginContext como DisposableRegistry
- vm.Context para todos los plugins, 1-3ms overhead aceptable

### Ingrid (Lead Backend)
- namespace-by-pluginId en HookRegistry para cleanup automático
- DisposableRegistry con timeout 5s para timers, listeners, connections
- plugin_registry table separada de options para admin panel
- Estado DRAINING para desactivación mid-request

### Raúl (Dev Backend)
- vm.Context: ~5-15µs por llamada, 1-3ms por request con muchos hooks
- unhandledRejection en async code escapa vm.Context — showstopper sin wrapper
- ESM vs CJS: plugins deben compilar a CJS para vm.Context
- Circuit breaker para auto-desactivar plugins rotos

---

## Conversación

**Román:** Bien, al grano. El problema central es sencillo de enunciar: WordPress tiene el lifecycle más fácil del mundo porque PHP lo resuelve gratis — el proceso muere, todo se limpia solo. Nosotros tenemos un proceso que vive eternamente y tenemos que gestionar el ciclo manualmente. Quiero que salgamos de aquí con decisiones concretas sobre seis puntos: instalación, activación sin restart, hook cleanup, hot reload, estado en memoria, y crash isolation. Voy uno por uno.

Primero, instalación. Mi propuesta: filesystem propio bajo `plugins/`, no `npm install`. El plugin lleva sus propias `node_modules` dentro, bundleado. El registry de qué plugins están activos vive en la tabla `options` con clave `active_plugins` — un array JSON de slugs. Exactamente como WP hace con `wp_options`. ¿Objeciones?

**Ingrid:** De acuerdo con `plugins/` como filesystem. Pero quiero añadir una tabla `plugin_registry` separada de `options` para metadatos:

```sql
plugin_registry (
  slug        text PRIMARY KEY,
  name        text NOT NULL,
  version     text NOT NULL,
  status      text NOT NULL,  -- 'active' | 'inactive' | 'error'
  activated_at timestamptz,
  error_log   text,
  meta        JSONB
)
```

Sin esto, el admin panel no puede mostrar la lista de plugins instalados con su estado. `active_plugins` en `options` es la fuente de verdad para el arranque del servidor — qué cargar. `plugin_registry` es la fuente de verdad para el admin — qué hay instalado y en qué estado está. Son dos preguntas distintas.

**Román:** Me gusta. Las dos tablas tienen propósitos claros. `options.active_plugins` con `autoload: true` para el boot, `plugin_registry` para el admin panel. Aceptado. Siguiente punto: activación sin restart.

Mi propuesta: `dynamic import()` nativo de Node.js. El admin activa un plugin, el PluginLoader hace `import('./plugins/my-plugin/index.js')`, el plugin ejecuta `activate(context)` que registra sus hooks, y ya está vivo. No necesitamos reiniciar el servidor. El problema es el cache de módulos — si desactivas y reactivas, `import()` devuelve el módulo cacheado. Solución: cache busting con versión y timestamp en el query param del import path.

**Raúl:** Román, tengo un problema con eso. El cache busting con `import('./plugin?v=1.2.3&t=timestamp')` funciona, pero genera una nueva entrada en el module graph cada vez. El módulo antiguo queda en memoria hasta que el GC lo colecte — si es que lo colecta, porque las closures pueden retener referencias. Con plugins pesados y reloads frecuentes en desarrollo, vas a ver picos de memoria. En producción es aceptable porque no haces reload cada 5 minutos. Pero en desarrollo es un problema real.

**Román:** ¿Cuál es tu propuesta para desarrollo?

**Raúl:** Para producción: deactivate + reimport con cache bust, que es lo que dices. Los reloads son raros, el leak es mínimo. Para desarrollo: un watcher que hace deactivate/activate limpio cuando detecta cambio en el directorio del plugin. Y si queremos ser más limpios, Worker Threads por plugin en dev mode — matas el worker y creas uno nuevo. Limpieza total. Coste: ~20-30ms de arranque por worker, pero en dev nadie mide milisegundos.

**Ingrid:** Antes de seguir con Workers, quiero cerrar un punto más importante: el hook cleanup en desactivación. Este es el que nos puede morder si lo hacemos mal.

El ADR-001 define `removeAction(tag, callback)` y `removeFilter(tag, callback)` usando referencia a función. Pero si el plugin registró closures anónimas — que es lo que hace el 80% de los plugins WP — no tienes la referencia para quitarlas. Necesitamos otro approach.

Mi propuesta: **namespace-by-pluginId en el HookRegistry**. Cada entrada de hook tiene un campo `pluginId`. Cuando el plugin llama `add_action('save_post', handler)`, el shim inyecta automáticamente el `pluginId` del contexto activo. En desactivación, un solo `hookRegistry.removeAllByPlugin('my-plugin')` limpia todo.

```typescript
interface HookEntry {
  callback: Function
  priority: number
  pluginId: string   // nuevo
}
```

El plugin no tiene que saber que esto existe. El cleanup es automático e incondicional.

**Román:** Eso resuelve el 90% del problema. Pero quiero ir más lejos. El `pluginId` en el HookRegistry es necesario, sí. Pero además propongo que cada plugin reciba un `PluginContext` que mantiene un registro interno de todo lo que ha registrado — hooks, timers, event listeners, connections. Es el pattern de `DisposableRegistry`.

```typescript
export async function activate(context: PluginContext) {
  context.addAction('save_post', myHandler)     // registra en HookRegistry + en la lista interna

  const interval = setInterval(syncJob, 60000)
  context.registerTimer(interval)                // el context sabe que tiene que hacer clearInterval

  const pool = new Pool(config)
  context.registerDisposable(pool)               // el context llamará pool.end() al desactivar
}
```

En desactivación, el PluginManager llama `context.dispose()` que:
1. Ejecuta `plugin.deactivate()` si existe — hook opcional para cleanup custom del plugin
2. `clearInterval` de todos los timers registrados
3. `emitter.off` de todos los listeners registrados
4. `await disposable.end()` para todas las conexiones
5. `hookRegistry.removeAllByPlugin(pluginId)` — la nuclear de Ingrid

El plugin no tiene que recordar hacer cleanup. El framework lo garantiza. Si `deactivate()` no existe o falla, `dispose()` se ejecuta igualmente.

**Ingrid:** Eso es exactamente lo que yo tenía en mente. El `PluginContext` es el owner del ciclo de vida. Una adición: timeout en `dispose()`. Máximo 5 segundos por plugin. Si un `pool.end()` cuelga, lo matamos. Log + alerta al admin.

**Raúl:** Pregunta para Román. ¿Todos los plugins pasan por `vm.Context` o solo los de terceros? Porque el overhead es real. He mirado benchmarks de Node.js 22: `vm.runInContext()` añade ~5-15 microsegundos por llamada. Si un request dispara 15 plugins con 3 hooks cada uno, son 45 boundary crossings — hasta 675 microsegundos extra. No es mucho en absoluto, pero si vamos a 200 hooks por request en un escenario `the_content` con muchos filtros, estamos en 1-3 milisegundos solo de overhead VM.

**Román:** Buena pregunta. Mi posición: para el MVP, todos los plugins pasan por vm.Context. Uniformidad. No quiero dos paths de ejecución — eso es deuda de testing. 1-3ms de overhead es asumible para un CMS. WordPress tarda 200-500ms en generar una página. Si NodePress tarda 50ms incluyendo el overhead de VM, seguimos siendo 4-10x más rápido. Dicho esto, Raúl, cuando hagas el spike del benchmark de vm.Context en Sprint 1, necesito ese número confirmado con plugins reales, no solo micro-benchmarks sintéticos.

**Raúl:** Entendido. Pero tengo otro problema con vm.Context que es más serio que el rendimiento. `vm.runInContext` atrapa excepciones síncronas, pero si el plugin lanza una Promise que rechaza sin `.catch()`, el `unhandledRejection` sale del contexto VM y llega al proceso principal. En Node.js 22, eso termina el proceso con exit code 1. Un plugin con un bug async tumba el servidor entero.

**Román:** Eso es un showstopper si no lo resolvemos. ¿Propuesta?

**Raúl:** Wrappear cada callback de hook registrado por un plugin:

```typescript
function wrapCallback(pluginId: string, fn: Function) {
  return async (...args: unknown[]) => {
    try {
      return await fn(...args);
    } catch (err) {
      logger.error({ pluginId, err }, 'Plugin hook error');
    }
  };
}
```

Combinado con un handler global de `process.on('unhandledRejection')` que loguea y no crashea. Y un circuit breaker: si un plugin lanza más de N errores en T tiempo, se desactiva automáticamente.

**Ingrid:** Me gusta el circuit breaker. Pero el wrapper async tiene una implicación que no podemos ignorar: si wrapeamos con async, todos los callbacks se convierten en async. Y nuestros filtros son síncronos por diseño — el ADR-001 es explícito en eso. Si `applyFilters` recibe un callback que devuelve una Promise, la cadena de filtros recibe una Promise como valor transformado en vez del valor real. Bug silencioso brutal.

**Román:** Buen catch. Entonces necesitamos dos wrappers: uno sync para filtros y otro async para acciones.

```typescript
function wrapSyncFilter(pluginId: string, fn: Function) {
  return (...args: unknown[]) => {
    try {
      const result = fn(...args);
      if (result instanceof Promise) {
        logger.error({ pluginId }, 'Filter returned Promise — filters must be sync');
        return args[0]; // devuelve valor sin modificar
      }
      return result;
    } catch (err) {
      logger.error({ pluginId, err }, 'Plugin filter error');
      return args[0]; // devuelve valor sin modificar
    }
  };
}

function wrapAsyncAction(pluginId: string, fn: Function) {
  return async (...args: unknown[]) => {
    try {
      await fn(...args);
    } catch (err) {
      logger.error({ pluginId, err }, 'Plugin action error');
    }
  };
}
```

Si un filtro devuelve una Promise, lo detectamos inmediatamente, logueamos, y devolvemos el valor sin modificar. Fail-safe.

**Raúl:** Perfecto. Eso resuelve el crash isolation para el 99% de los casos. El 1% restante — un plugin que hace `while(true)` y bloquea el event loop — no tiene solución con vm.Context. Para eso necesitaríamos Worker Threads con timeout. Pero para el MVP, documentar la limitación y seguir.

**Ingrid:** Quiero cerrar otro punto: el estado en memoria. En WP, los plugins son stateless porque PHP muere. Aquí, los plugins pueden tener estado. ¿Cómo lo gestionamos?

**Román:** Lo acepto como feature, no como bug. Permite caches en memoria, rate limiting, WebSocket state. Pero con tres reglas claras. Uno: el estado en memoria es efímero — si el servidor reinicia, se pierde. Persistencia va por DB o Redis a través del PluginContext API. Dos: el estado no sobrevive a una desactivación — `dispose()` destruye el contexto y todo lo que tenga. Tres: sin estado global — el vm.Context aísla los globals de cada plugin.

**Ingrid:** De acuerdo con las tres reglas. Una cosa más: ¿qué pasa con la desactivación mid-request? Un filtro `the_content` se está ejecutando, y en ese momento el admin desactiva el plugin. El handler ya está en la queue de ejecución.

**Román:** Para `apply_filters` síncrono el riesgo es mínimo — la ejecución es O(microsegundos), ya estás dentro del callback cuando llega el deactivate. El callback se completa, luego el cleanup corre. El problema sería con `do_action` async donde el handler hace I/O largo. Propongo un estado `DRAINING` en el `PluginState` enum. Al recibir desactivación, el plugin pasa a DRAINING — deja de aceptar nuevas ejecuciones pero las inflight se completan. Con un timeout de 10 segundos máximo.

**Ingrid:** Pragmático. Para v1 es suficiente. Una última cosa, Raúl: ¿ESM o CJS para los plugins compilados? Porque vm.Context trabaja mejor con CJS, pero el proyecto es TypeScript strict que implica ESM.

**Raúl:** Este es un punto que necesita decisión ya. `vm.runInContext` funciona con strings de código evaluadas — es agnóstico a CJS/ESM. Pero `vm.Module` que sería lo "correcto" para ESM todavía es experimental en Node 22. Mi recomendación: los plugins se compilan a CJS para ejecución en vm.Context. El `plugin.json` manifest declara el entry point ya compilado. En desarrollo, el plugin dev usa un build step con esbuild o tsup que genera CJS. Es un paso extra pero resuelve el problema limpiamente.

**Román:** Aceptado. Plugins compilan a CJS para sandboxing. El CLI de desarrollo tendrá un `nodepress plugin build` que hace esa compilación con esbuild. Añadimos eso al scope de `packages/cli`.

Bien, resumo las decisiones. ¿Alguna objeción antes de cerrar?

**Ingrid:** Ninguna. Todo cuadra.

**Raúl:** Yo tampoco. Solo quiero confirmar que el benchmark de vm.Context lo hago en el spike de Sprint 1, ¿correcto?

**Román:** Correcto. El spike tiene dos partes ahora: php-wasm con un shortcode plugin WP, y benchmark de vm.Context con un plugin JS que registra 50 hooks. Dos días, dos entregables.

---

## Puntos Importantes

1. Instalación en `plugins/` + DB dual: `options.active_plugins` para boot, `plugin_registry` table para admin. (Román + Ingrid)
2. Activación sin restart via dynamic import() con cache busting. Worker Threads solo en dev. (Román, Raúl)
3. Hook cleanup automático con pluginId en HookRegistry — removeAllByPlugin(). (Ingrid)
4. PluginContext como DisposableRegistry — cleanup garantizado por framework, timeout 5s. (Román + Ingrid)
5. Dos wrappers: wrapSyncFilter (detecta Promise, fail-safe) + wrapAsyncAction (try/catch). Circuit breaker. (Raúl + Ingrid)
6. Todos los plugins por vm.Context — uniformidad, 1-3ms overhead aceptable. (Román)
7. Plugins compilan a CJS para vm.Context. Build con esbuild. (Raúl)
8. Estado en memoria permitido, efímero, aislado. No sobrevive restart ni deactivate. (Román)
9. Estado DRAINING en desactivación — inflight completan, timeout 10s. (Román + Ingrid)
10. vm.Context no aísla CPU (while true) — limitación documentada MVP. (Raúl)

## Conclusiones

- El ciclo de vida de plugins en NodePress es radicalmente diferente al de WP y eso es una ventaja
- PluginContext + DisposableRegistry es el patrón central
- Filtros síncronos con detección de Promise resuelven async leak
- Sin desacuerdos — las tres propuestas convergen limpiamente

## Acciones

| # | Acción | Responsable | Plazo |
|---|--------|-------------|-------|
| 1 | Diseñar interfaz PluginContext + DisposableRegistry (types.ts) | Ingrid | Sprint 1 (semana 1) |
| 2 | Implementar removeAllByPlugin(pluginId) en HookRegistry | Román | Sprint 1 |
| 3 | Implementar wrapSyncFilter + wrapAsyncAction + circuit breaker | Raúl | Sprint 1 |
| 4 | Benchmark vm.Context: plugin 50 hooks, overhead por request | Raúl | Sprint 1 (spike) |
| 5 | Schema plugin_registry table en packages/db | Ingrid | Sprint 1 |
| 6 | Definir `nodepress plugin build` en CLI scope (esbuild→CJS) | Román | Sprint 2 |
| 7 | Documentar Plugin Development Guide | Román | Sprint 2 |

---

_Generado por /meet — Trinity_
