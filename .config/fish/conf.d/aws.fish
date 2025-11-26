function sam-dev
    nr build
    if test $status -ne 0
        return
    end
    nr cfn-lint
    if test $status -ne 0
        return
    end
    sam local start-api --config-file samconfig-ephemeral.toml $argv 2>&1 | pretty
end

function sam-deploy
    sam build
    set -l configFile samconfig-ephemeral.toml
    sam deploy --config-file $configFile $argv
end
