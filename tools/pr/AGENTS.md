# pr-cli

## Rules

- Before finishing work that changes TypeScript in this directory, run `npm run validate` from `tools/pr-cli` (or `node validate.ts` here); it must pass.
- When you change the `pr` CLI (subcommands, flags, or help text in `tools/pr`), update `tools/pr/pr.fish` (fish completions); `home/.config/fish/completions/pr.fish` and `tools/pr/autocomplete.fish` symlink to it
- Agent prompts live in `home/.config/interpolate/` as `pr-create.md`, `pr-update.md`, `pr-review.md` (`?work:` lines when `PR_CLI_WORK=true`); expanded via `tools/interpolate`
