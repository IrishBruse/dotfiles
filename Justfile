
# Run by default when you type `just`
default: validate

# Typecheck all TypeScript projects (see scripts/validate.ts)
validate:
    npm run validate

# Export Cursor CLI agent chats to markdown (see tools/export-cursor-chats)
export-cursor-chats out="cursor-chats-export":
    node --experimental-strip-types tools/export-cursor-chats/src/main.ts --out {{out}}

# Root package only (includes shared `tsc`)
install:
    npm install

# Root plus each package that has its own dependencies
install-all: install
    npm --prefix tools/pr install
    npm --prefix tools/atlassian install
    npm --prefix tools/agent-tool install
    npm --prefix tools/interpolate install
    npm --prefix tools/export-cursor-chats install
    npm --prefix scripts install
    npm --prefix vscode install

# Global `npm link` for each package under tools/ (install deps first: install-all)
link:
    cd "{{ justfile_directory() }}/tools/pr" && npm link
    cd "{{ justfile_directory() }}/tools/atlassian" && npm link
    cd "{{ justfile_directory() }}/tools/agent-tool" && npm link
    cd "{{ justfile_directory() }}/tools/interpolate" && npm link
    cd "{{ justfile_directory() }}/tools/export-cursor-chats" && npm link
