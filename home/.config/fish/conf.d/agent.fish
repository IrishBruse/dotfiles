function a
    agent --model composer-2.5 "$argv"
end

function aa
    agent --mode ask --model composer-2.5 "$argv"
end

function ap
    agent --plan --model composer-2.5 "$argv"
end

function ac
    agent --continue --model composer-2.5 "$argv"
end

function ag
    agent --model gpt-5.6-terra "$argv"
end

function ao
    agent --model claude-opus-4-8-thinking-medium "$argv"
end

# Fish autoloads completions/COMMAND.fish only for that command name, not aliases.
if not functions -q __fish_agent_skills
    source $__fish_config_dir/completions/agent.fish
end
