set -gx PATH "/Users/econneely/.local/state/fnm_multishells/7354_1764097639449/bin" $PATH;
set -gx FNM_MULTISHELL_PATH "/Users/econneely/.local/state/fnm_multishells/7354_1764097639449";
set -gx FNM_VERSION_FILE_STRATEGY "local";
set -gx FNM_DIR "/Users/econneely/.local/share/fnm";
set -gx FNM_LOGLEVEL "info";
set -gx FNM_NODE_DIST_MIRROR "https://nodejs.org/dist";
set -gx FNM_COREPACK_ENABLED "false";
set -gx FNM_RESOLVE_ENGINES "true";
set -gx FNM_ARCH "arm64";
function _fnm_autoload_hook --on-variable PWD --description 'Change Node version on directory change'
    status --is-command-substitution; and return
    if test -f .node-version -o -f .nvmrc -o -f package.json
    fnm use --silent-if-unchanged
end

end

_fnm_autoload_hook

