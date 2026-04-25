function jwt
    set splits (echo $argv[1] | string split ".")
    string join "" (echo $splits[2]) "==" | base64 --decode | jq
end
