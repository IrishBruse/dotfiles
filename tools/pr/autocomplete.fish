# pr — GitHub pull request helper (fish completions)

complete -c pr -n '__fish_use_subcommand' -a fix -d 'Fix failed PR checks and workflows'
complete -c pr -s p -l print -d 'Print resolved prompt and exit'
complete -c pr -s h -l help -d 'Show help'
