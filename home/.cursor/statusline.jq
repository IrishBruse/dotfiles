#!/usr/bin/env -S jq -rf
def k: ((. / 100 | round) as $d | "\($d / 10 | floor).\($d % 10)k");
def tilde:
  (env.HOME // "" | sub("/$"; "")) as $h
  | if . == "" then "?"
    elif $h != "" and . == $h then "~"
    elif $h != "" and startswith($h + "/") then "~" + .[$h | length:]
    else . end;
(.cwd // .workspace.current_dir // "" | tilde) as $dir
| (.model.display_name // .model.id // "?") as $model
| .context_window.total_input_tokens as $tok
| (.context_window.context_window_size // 200000) as $limit
| "\u001b[90m\($dir)  \($model)"
  + if $tok != null and $tok > 0 then "  \($tok | k)/\($limit | k)" else "" end
