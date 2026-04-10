# Agent Task Protocol — NodePress

> Protocolo de lifecycle de tareas para agentes AI en este proyecto.
> Complementa ORCHESTRATOR.md (reglas globales) con reglas específicas de NodePress.

---

## Phases

### Phase 0 — Context Loading (BLOCKING — always required)

Before any action, the agent MUST read (in order):

1. `AGENT.md` — identity, voice, constraints
2. `tech_memory.md` — global technical rules
3. `project_memory.md` — project-specific context
4. `CLAUDE.md` — project rules

**Self-defense:** If the orchestrator brief does not include mandatory reads, the agent MUST respond:
> "CONTEXT LOADING INCOMPLETO. Re-lanza con el bloque de mandatory reads."
And stop execution.

**Verification:** The orchestrator checks that Read tool calls for the correct files appear in the agent's tool log.

---

### Phase 1 — Task Receipt (complex tasks only)

For tasks with dependencies or involving multiple packages, the agent produces before starting work:

```
TASK RECEIPT — [agent-name] — [date]
Task received: [1-line description]
Scope confirmed: [what I will do]
Out of scope: [what I will NOT do — explicit]
Dependencies verified: [list or "none"]
Deliverable promised: [concrete format]
```

**When to skip:** Simple tasks (single file, config change, < 5 tool calls). Context Loading is still required.

---

### Phase 2 — Execution

Standard execution. Parallel tool calls when independent. No special protocol changes.

**Checkpoints** (for tasks > 15 tool calls):
```
CHECKPOINT — [agent-name] — [progress%]
Done: [list]
Pending: [list]
Blockers: [none | description]
```

**Decisions during execution:** If the agent makes a decision not in the brief, log it in `sprint_N_memory.md`:
```markdown
- **[Decision]:** description. **Why:** reason. **Date:** YYYY-MM-DD
```

---

### Phase 3 — Task Delivery (always required)

At completion, the agent produces:

```
TASK DELIVERY — [agent-name] — [date]
Task completed: [1-line description]
Deliverable: [file paths | output description]
Unblocked: [list of agents/tasks that can now proceed | "none"]
Memory updated: [which memories and what was added | "none"]
Decisions made: [non-trivial decisions taken during execution | "none"]
Review required: [none | Román — architecture | peer — standard]
Anomalies: [unexpected issues found | "none"]
```

---

## Review Gate

Review follows the tiered policy from `docs/guides/contributing.md`:

| Package | Reviewer |
|---------|----------|
| `packages/core`, `packages/plugin-api` | Román (mandatory) |
| All other packages | Peer review (1 approval) |
| ADRs with ops impact | Román + Martín |

The reviewer agent is launched by the orchestrator with the producer agent's output as context.

---

## Memory Commits

**Rule: memories are committed with the work. Never separate. Never later.**

Each commit that includes agent work SHOULD also include updated memories in `.claude/memory/`.

---

## Task Log

`.claude/task_log.md` — append-only audit trail.

Format (one line per task):

```markdown
| Date | Agent | Task | Output | Commit | Status |
```

The agent appends its line at the end of the file after completing Task Delivery.

---

## Agent Interaction

**Agents do NOT communicate directly.** All coordination passes through the orchestrator.

If an agent discovers a dependency during execution:
> "BLOQUEADO: Necesito [X] de [agent-name] para continuar."

The orchestrator receives this, creates the task for the blocking agent, and resumes the blocked agent when resolved.

---

## Scaling by Complexity

| Complexity | Phases required | Task Receipt | Checkpoints | Task Delivery |
|------------|----------------|--------------|-------------|---------------|
| Simple | 0 + 3 | No | No | Minimal |
| Moderate | 0 + 3 | Optional | No | Full |
| Complex | 0 + 1 + 2 + 3 | Required | If > 15 calls | Full |

---

_Decisions from meeting 2026-04-09 (Tomás, Román, Diana)._
