function __fish_interpolate_prompt_names
    set -l dir $HOME/.config/interpolate
    test -d $dir; or return
    for f in $dir/*.md
        test -f $f; or continue
        string replace -r '\.md$' '' -- (path basename $f)
    end
end
