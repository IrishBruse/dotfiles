# pr — GitHub pull request helper (fish completions)

complete -c pr -n '__fish_use_subcommand' -f -a 'create' -d 'Prepare or open a new PR for this branch'
complete -c pr -n '__fish_use_subcommand' -f -a 'update' -d 'Refresh an existing PR for this branch'
complete -c pr -n '__fish_use_subcommand' -f -a 'review' -d 'Review a PR URL or number (skeleton)'
complete -c pr -n '__fish_use_subcommand' -f -a 'help' -d 'Show help'

complete -c pr -n '__fish_use_subcommand' -s h -l help -d 'Show help'
