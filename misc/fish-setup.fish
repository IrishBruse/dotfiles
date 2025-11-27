#!/usr/bin/env fish

for opt in (command ls /opt/)
    fish_add_path -g "/opt/$opt"
end

function setU -a name value
    set --erase $name
    set -U $name $value
end

fish_add_path -U $HOME/.local/share/fnm/

setU ARTIFACT_AUTH_TOKEN_TIMESTAMP 0
setU fish_greeting

setU fish_color_autosuggestion brblack
setU fish_color_command magenta
setU fish_color_comment 5C6370

setU fish_color_error red
setU fish_color_escape 56b6c2
setU fish_color_history_current 56b6c2

setU fish_color_keyword magenta
setU fish_color_option blue # flag
setU fish_color_valid_path cyan
setU fish_color_redirection yellow

setU fish_color_end yellow
setU fish_color_operator yellow

setU fish_color_normal normal
setU fish_color_param bcbcbc
setU fish_color_quote green

setU fish_color_search_match brred
setU fish_color_match ff00ff
setU fish_color_selection ff00ff

# unknown
setU fish_color_user 00ff00
setU fish_color_cancel 00ff00
setU fish_color_status 00ff00
setU fish_color_host 00ff00
setU fish_color_host_remote 00ff00
setU fish_color_cwd 00ff00
setU fish_color_cwd_root 00ff00
