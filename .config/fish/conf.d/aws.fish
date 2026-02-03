function sam-dev
    nr cfn-lint
    and nr build
    and sam sync --watch --config-file samconfig-ephemeral.toml $argv
end

function sam-deploy
    sam build
    and set -l configFile samconfig-ephemeral.toml
    and sam deploy --config-file $configFile $argv
end
