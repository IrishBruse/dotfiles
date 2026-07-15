function ni --wraps "npm install"
    set -l log (mktemp)
    npm install --save $argv 2>&1 | tee $log
    set -l exit_code $pipestatus[1]
    if test $exit_code -ne 0
        if string match -q '*403*' -- (cat $log)
            rm -f $log
            token
            or return $status
            npm install --save $argv
            return $status
        end
    end
    rm -f $log
    return $exit_code
end
