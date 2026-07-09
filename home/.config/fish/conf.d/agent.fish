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
