#!/usr/bin/env bash
payload=$(cat)
echo "$payload" | jq -r '
  def fmtk(x):
    if x == null then "?"
    else
      ((x / 1000 * 10 | round) / 10) as $n |
      (($n | floor | tostring) + "." + (($n * 10 | round) % 10 | tostring) + "k")
    end;
  (.context_window // {}) as $cw |
  ($cw.total_input_tokens) as $t |
  ($cw.context_window_size) as $c |
  (if ($t == null or $t == 0) then "0" else fmtk($t) end) as $left |
  (if $c == null then "100k" else fmtk($c) end) as $right |
  "\u001b[90m\(.model.display_name // .model.id // "?")  \($left)/\($right)\u001b[0m"
'
