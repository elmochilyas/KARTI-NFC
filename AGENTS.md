# Karti agent gateway

This repository is the **Karti** NFC digital contact-card platform.

Mandatory context lives in [`specs/AGENTS.md`](specs/AGENTS.md).
Read it before writing any code, then follow the read order in
[`specs/SPEC_INDEX.md`](specs/SPEC_INDEX.md).

Key rules:

- `specs/TASKS.md` is the implementation tracker — update it as work progresses.
- `specs/DECISIONS.md` records meaningful architectural decisions.
- A physical NFC card / QR contains only the permanent URL
  `https://karti.app/t/{shortCode}`; the dashboard changes the destination
  behind that URL. Never break this invariant.
- Keep `Client`, `Profile`, `Card`, and `Destination` as separate concepts.
- Verify with `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`.
  Never claim a check passed without running it.
