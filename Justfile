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
    npm run build
    npm link
