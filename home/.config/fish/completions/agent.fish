# Cursor `agent` CLI completions (fish)
# Skills: ~/.cursor/skills, ~/.agents/skills, $PWD/.cursor/skills, git root .cursor/skills, …
# Global /-skill list (plain text, one name per line; must start with /; # comments):
#   ~/dotfiles/home/.config/fish/global-skills.txt
# Skill picks: /name only — @ prefixes file refs; no bare filenames in completions (use -f)

function __fish_agent_skill_roots
    set -l roots ~/.cursor/skills ~/.agents/skills $HOME/dotfiles/.agents/skills

    # Workspace: cwd (e.g. open project) and git top-level when cwd is a subfolder
    set -l bases $PWD
    set -l gitroot (command git -C $PWD rev-parse --show-toplevel 2>/dev/null)
    if test -n "$gitroot"
        contains -- $gitroot $bases; or set -a bases $gitroot
    end

    for base in $bases
        for sub in .cursor/skills .agents/skills
            set -l candidate $base/$sub
            test -d $candidate; or continue
            set -a roots (path resolve $candidate)
        end
    end

    set -l uniq
    for r in $roots
        contains -- $r $uniq; and continue
        set -a uniq $r
    end
    if test (count $uniq) -gt 0
        printf '%s\n' $uniq
    end
end

function __fish_agent_skills
    set -l seen

    for name in (__fish_agent_skills_from_files)
        contains -- $name $seen; and continue
        set -a seen $name
        printf '/%s\tglobal\n' $name
    end

    for root in (__fish_agent_skill_roots)
        test -d $root; or continue
        for d in $root/*/
            test -d $d; or continue
            test -f $d/SKILL.md; or continue
            set -l name (path basename $d)
            contains -- $name $seen; and continue
            set -a seen $name
            printf '/%s\n' $name
        end
    end
end

function __fish_agent_global_skills_list_file
    set -l def $HOME/dotfiles/home/.config/fish/global-skills.txt
    test -f $def; and path resolve $def
end

function __fish_agent_skill_pick_files
    set -l bases $PWD
    set -l gitroot (command git -C $PWD rev-parse --show-toplevel 2>/dev/null)
    if test -n "$gitroot"
        contains -- $gitroot $bases; or set -a bases $gitroot
    end

    set -l files
    for base in $bases
        set -l candidate $base/.cursor/skills
        test -f $candidate; or continue
        set -a files $candidate
    end

    set -l uniq
    for f in $files
        contains -- $f $uniq; and continue
        set -a uniq $f
    end
    if test (count $uniq) -gt 0
        printf '%s\n' $uniq
    end
end

function __fish_agent_all_skill_list_files
    set -l g (__fish_agent_global_skills_list_file)
    test -n "$g"; and printf '%s\n' $g
    for f in (__fish_agent_skill_pick_files)
        printf '%s\n' $f
    end
end

function __fish_agent_skills_from_files
    set -l out
    for f in (__fish_agent_all_skill_list_files)
        test -f $f; or continue
        for line in (string split \n -- (command cat $f 2>/dev/null))
            set -l s (string trim -- $line)
            test -n "$s"; or continue
            string match -qr '^\s*#' -- $s; and continue

            set -l no_comment (string replace -r '#.*$' '' -- $s | string trim)
            test -n "$no_comment"; or continue

            set -l tok (string split --max 1 ' ' -- $no_comment)[1]
            set -l trimmed_tok (string trim -- $tok)
            string match -qr '^/' -- $trimmed_tok; or continue
            set -l name (string replace -r '^/' '' -- $trimmed_tok)
            test -n "$name"; or continue

            contains -- $name $out; and continue
            set -a out $name
        end
    end
    if test (count $out) -gt 0
        printf '%s\n' $out
    end
end

function __fish_agent_models
    set -l buf
    set -l err (agent models 2>&1 | string replace -ra '\e\[[0-9;?]*[a-zA-Z]' '')
    set buf $err
    if test (count $buf) -eq 0
        return
    end
    for line in $buf
        set -l m (string match -r '^([a-zA-Z0-9_.-]+)\s+-\s' $line)
        test (count $m) -ge 2; or continue
        printf '%s\t%s\n' $m[2] (string trim $line)
    end
end

function __fish_agent_is_subagent_prompt
    set -l cl (commandline -opc)
    test (count $cl) -ge 2; or return 1
    test "$cl[1]" = agent; or return 1
    set -l hits 0
    for t in $cl
        test "$t" = agent; and set hits (math $hits + 1)
    end
    test $hits -ge 2
end

function __fish_agent_is_continue_prompt
    set -l cl (commandline -opc)
    test "$cl[1]" = agent; or return 1
    contains -- --continue $cl; or return 1
    return 0
end

function __fish_agent_should_suggest_skills
    __fish_agent_is_subagent_prompt; or __fish_agent_is_continue_prompt
end

function __fish_agent_typing_at_ref
    string match -qr '^@' -- (commandline -ct)
end

function __fish_agent_at_file_refs
    set -l tok (commandline -ct)
    string match -q '@*' -- $tok; or return 1
    set -l rp (string sub -s 2 -- $tok)

    if test -z "$rp"
        for p in ./*
            test -e $p; or continue
            __fish_agent_emit_at_path $p
        end
        return 0
    end

    if string match -qr '/$' -- $rp
        set -l dir (string replace -r '/+$' '' -- $rp)
        test -n "$dir"; or set dir /
        # fish `test` is not bash: `-d` takes exactly one path; do not use `--`
        set -l dirpath $dir[1]
        test -d $dirpath; or return 1
        for p in $dirpath/*
            test -e $p; or continue
            __fish_agent_emit_at_path $p
        end
        for p in $dirpath/.*
            set -l bn (path basename $p)
            test "$bn" = .; and continue
            test "$bn" = ..; and continue
            test -e $p; or continue
            __fish_agent_emit_at_path $p
        end
        return 0
    end

    set -l parent (path dirname $rp)
    set -l leaf (path basename $rp)
    if test "$parent" = .
        for p in ./$leaf*
            test -e $p; or continue
            __fish_agent_emit_at_path $p
        end
    else
        for p in $parent/$leaf*
            test -e $p; or continue
            __fish_agent_emit_at_path $p
        end
    end
end

function __fish_agent_emit_at_path -a p
    set -l rel (string replace -r '^\./' '' $p)
    if test -d $p
        printf '@%s/\t@dir\n' $rel
    else
        printf '@%s\t@file\n' $rel
    end
end

function __fish_agent_line_has_continue
    contains -- --continue (commandline -opc)
end

# --- Top-level flags (see `agent --help`) ---
complete -c agent -s v -l version -d 'Print version'
complete -c agent -l api-key -r -d 'API key (or CURSOR_API_KEY)'
complete -c agent -s H -l header -r -d "Extra header ('Name: Value')"
complete -c agent -s p -l print -d 'Print to stdout (non-interactive)'
complete -c agent -l output-format -r -f -a 'text json stream-json' -d 'With --print'
complete -c agent -l stream-partial-output -d 'Stream partial output (--print + stream-json)'
complete -c agent -s c -l cloud -d 'Cloud mode (composer picker)'
complete -c agent -l mode -r -f -a 'plan ask' -d 'Execution mode'
complete -c agent -l plan -d 'Plan mode (shorthand for --mode=plan)'
complete -c agent -l resume -r -d 'Resume session (optional chat id)'
complete -c agent -l continue -d 'Continue previous session'
complete -c agent -l model -r -a '(__fish_agent_models)' -d 'Model id'
complete -c agent -l list-models -d 'List models and exit'
complete -c agent -s f -l force -d 'Allow commands unless denied'
complete -c agent -l yolo -d 'Same as --force'
complete -c agent -l sandbox -r -f -a 'enabled disabled' -d 'Sandbox override'
complete -c agent -l approve-mcps -d 'Auto-approve MCP servers'
complete -c agent -l trust -d 'Trust workspace (--print)'
complete -c agent -l workspace -r -d 'Workspace directory' -F
complete -c agent -s w -l worktree -r -d 'Isolated git worktree' -F
complete -c agent -l worktree-base -r -d 'Base branch/ref for worktree'
complete -c agent -l skip-worktree-setup -d 'Skip worktree setup scripts'
complete -c agent -s h -l help -d Help

# Subcommands (first non-option token; not after --continue — that flow is prompt-only)
set -l __fish_agent_subcmds install-shell-integration uninstall-shell-integration login logout mcp \
    status whoami models about update create-chat generate-rule rule agent ls resume help
complete -c agent -f -n '__fish_use_subcommand; and not __fish_agent_line_has_continue' -a "$__fish_agent_subcmds"

# Prompt: /skills; @path file refs tab-complete when token starts with @
complete -c agent -f -n '__fish_agent_should_suggest_skills; and not __fish_agent_typing_at_ref' -a '(__fish_agent_skills)'

# Prompt: @path file references
complete -c agent -f -n '__fish_agent_should_suggest_skills; and __fish_agent_typing_at_ref' -a '(__fish_agent_at_file_refs)'

function __fish_agent_last_token_is
    test (commandline -opc)[-1] = $argv[1]
end

# mcp (after `agent mcp …`)
complete -c agent -n '__fish_agent_last_token_is mcp' -f -a 'login list list-tools enable disable'

# help (after `agent help …`)
complete -c agent -n '__fish_agent_last_token_is help' -f -a "$__fish_agent_subcmds"

# --- Shortcuts from ~/.config/fish/config.fish ---
complete -c ac -w agent
complete -c a -w 'agent agent'
complete -c ap -w 'agent --mode=plan agent'
complete -c aa -w 'agent --mode=ask agent'
