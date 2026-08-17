function a
    agent --model auto "$argv"
end

function aa
    agent --ask --model auto "$argv"
end

function ap
    agent --plan --model auto "$argv"
end

function ac
    agent --continue "$argv"
end

function ag
    agent --model cursor-grok-4.6-high "$argv"
end

function at
    agent --model gpt-5.6-terra "$argv"
end

function ao
    agent --model claude-opus-5-thinking-medium "$argv"
end

# Fish autoloads completions/COMMAND.fish only for that command name, not aliases.
if not functions -q __fish_agent_skills
    source $__fish_config_dir/completions/agent.fish
end
