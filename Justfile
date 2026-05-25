
# Run by default when you type `just`
default: validate

# Typecheck all TypeScript projects (see scripts/validate.ts)
validate:
    npm run validate

# Export Cursor CLI agent chats to markdown (see tools/export-cursor-chats)
export-cursor-chats out="cursor-chats-export":
    node --experimental-strip-types tools/export-cursor-chats/main.ts --out {{out}}

# Root plus tools, scripts, and vscode packages
[script]
install: install
    npm --prefix tools install &
    npm --prefix scripts install &
    npm --prefix vscode install &
    wait


[working-directory: "tools"]
link:
    npm link
