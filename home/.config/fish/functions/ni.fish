function ni --wraps "npm install"
    __npm_auth_retry install --save $argv
end
