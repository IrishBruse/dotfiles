function ni --wraps "npm install"
    npm install --save $argv
    if test $status -ne 0
        token || return $status
        npm install --save $argv
        return $status
    end
end
