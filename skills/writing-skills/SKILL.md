---
name: writing-skills
description: How to create and maintain skills in this project. Use when creating a new skill, improving an existing one, or auditing the library.
disable-model-invocation: true
---

A skill answers: "What do I wish I'd known 30 minutes ago?" It is a **recipe** (how to do/fix something), not a state description (what currently exists — that belongs in a doc).

## Non-negotiable rules
1. **`name` frontmatter MUST match the directory name** exactly (lowercase, hyphens).
2. **Generic skills MUST NOT hardcode project-specific values** — but this project's own conventions (WCAG 2.1 AA; the breakpoint set recorded in `tools/quality/breakpoints.json`, default 600/900/1200) ARE the standard here, so state them plainly.
3. **Project-specific skills are prefixed `project-`**; unvalidated ones `draft-`.
4. **Update `skills/README.md` with every skill change** — a skill not in the index may as well not exist.
5. **Never edit AGENTS.md's Rules section when adding a skill** — skills extend the rules, never override them.
6. **Push checkable rules down to a script.** If a rule has a threshold or an exact pattern a script could catch (a breakpoint value, an off-palette color, missing alt), give it a stable ID (`<!-- rule:xxx -->`) and point the skill at the enforcing command. The script owns the number; the skill explains the why and the fix.

## Format
```yaml
---
name: my-skill
description: What it does. When to use it. Key trigger phrases (first).
---
[Key insight — the one sentence that unblocks.]

## Recipe
[Numbered steps, commands, tables. Copy-pasteable. No preamble.]

## Pitfalls
- [What you'd try → why it fails. 2–4 lines.]

See also: `related-skill` (why)
```

## Quality bar
- **Prescriptive** ("do X", "never Y"), **concrete** (real selectors/values/commands), **scannable** (tables/code over prose), ~20–30 lines.
- **Name load-bearing rules** with a citable handle and a threshold or exact trigger — a rule with no threshold can't be checked.
- **List anti-patterns match-and-refuse** — what the bad version looks like → the rewrite.
- **Cross-reference, don't duplicate** — one skill owns each concept; link the rest with `See also:`.
