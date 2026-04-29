function v
    if test (count $argv) -eq 0
        code .
    else
        code $argv
    end
end
