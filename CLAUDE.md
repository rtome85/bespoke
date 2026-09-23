# CLAUDE.md

This project keeps its agent guidance in **[AGENTS.md](./AGENTS.md)** — read that
file. It covers the build/verify commands (there is no test framework),
architecture, the Prettier / `aa-*` token / `~` alias conventions, and the git
workflow.

Quick reminders that bite most often here:

- Verify every change with `npx tsc --noEmit`, `pnpm build`, **and**
  `pnpm build:firefox`.
- Never `prettier --write` a whole pre-existing file — the tree isn't uniformly
  formatted; hand-place edits, only auto-format files you created.
- No arbitrary Tailwind values (`text-[13px]`) and no class-string consts
  (`const CARD_CLASS = "…"`) — extend the `aa-*` token scale in
  `tailwind.config.js` or add a class to the `@layer components` block in
  `src/style.css` instead.
- Mutate the application list only through `mutateSavedApplications()` in
  `src/storage/savedApplications.ts`.
- Branch off `main`, open a PR against `main`, never commit to `main` directly.
  Stop at "builds green" and wait for an explicit commit/PR instruction.
