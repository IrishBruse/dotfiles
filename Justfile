
# Run by default when you type `just`
default: validate

# Typecheck root, tools, and vscode (see package.json validate script)
validate:
    npm run validate

# Export Cursor CLI agent chats to markdown (see tools/export-cursor-chats)
export-cursor-chats out="cursor-chats-export":
    node --experimental-strip-types tools/export-cursor-chats/main.ts --out {{out}}

# Root package only (shared tsc for validate)
install:
    npm install

# Root plus tools and vscode packages
[script]
install-all: install
    npm --prefix tools install &
    npm --prefix vscode install &
    wait


[working-directory: "tools"]
link:
    npm link
