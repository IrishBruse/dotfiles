function __npm_auth_retry --description "Run an npm install, refreshing ARTIFACT_AUTH_TOKEN once on a registry auth failure"
    set -l err (mktemp)
    command npm $argv 2>&1 | tee $err
    set -l code $pipestatus[1]

    if test $code -eq 0
        rm -f $err
        return 0
    end

    if not string match -qr 'E40[13]|401 Unauthorized|403 Forbidden' -- (cat $err)
        rm -f $err
        return $code
    end

    rm -f $err
    echo "npm registry auth failed, refreshing token" >&2
    token || return $status
    command npm $argv
end
