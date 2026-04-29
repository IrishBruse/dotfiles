function paths
    echo $PATH | string split ' ' | sort | fzf
end
