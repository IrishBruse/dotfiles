function nid --wraps "npm install"
    __npm_auth_retry install --save-dev $argv
end
