
# Run by default when you type `just`
default: validate

# Typecheck all TypeScript projects (see scripts/validate.ts)
validate:
    npm run validate

# Root package only (includes shared `tsc`)
install:
    npm install

# Root plus each package that has its own dependencies
install-all: install
    npm --prefix tools/pr install
    npm --prefix tools/atlassian install
    npm --prefix scripts install
    npm --prefix vscode install

# Global `npm link` for each package under tools/ (install deps first: install-all)
link:
    cd "{{ justfile_directory() }}/tools/pr" && npm link
    cd "{{ justfile_directory() }}/tools/atlassian" && npm link
