# Karti — Git & Change Workflow

## 1. Protect existing work

Before coding:

```text
git status
git diff
```

Never discard unknown uncommitted changes.

## 2. Scope

Keep changes focused on the active task.

Do not:

- mass-format unrelated files;
- refactor unrelated modules;
- rename large directories without need.

## 3. Branches

Work happens on feature branches, never directly on `main`:

```text
feature/client-management
feature/public-profile
feature/card-routing
```

Flow:

```text
feature branch
→ pull request
→ CI green (jobs: test, build)
→ review
→ merge to main
→ Vercel production deployment (Phase 14 CD)
```

Follow existing repository conventions if already defined.

Recommended branch protection on `main` (configure manually — no API
access here): require PR, require status checks `test` and `build`,
prevent direct pushes.

## 4. Commits

When commits are requested, make coherent commits.

Examples:

```text
feat(cards): add permanent redirect resolver
feat(profiles): add vCard export
fix(auth): enforce dashboard session
```

Do not commit secrets.

## 5. Database changes

Migration files and application changes belong in the same logical workstream.

A database change applied via MCP but absent from Git is incomplete.

## 6. Generated files

Commit generated Supabase types if that is the project's established approach.

Do not manually edit them.

## 7. Task tracker

Update `specs/TASKS.md` as part of implementation, not as an afterthought.

## 8. Agent safety

AI agents must not:

- force-push;
- reset hard over user changes;
- delete branches;
- rewrite history;
- auto-merge unknown work;

unless explicitly instructed.
