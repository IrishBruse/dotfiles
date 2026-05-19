function __a_try_interpolate -a argv
    if test (count $argv) -lt 1
        return 1
    end
    if not string match -qr '^!' -- $argv[1]
        return 1
    end

    set -l name (string sub -s 2 -- $argv[1])
    if test -z "$name"
        echo "a: missing interpolate template name after !" >&2
        return 1
    end
    if not command -q interpolate
        echo "a: interpolate not found in PATH" >&2
        return 1
    end

    set -l rest $argv[2..-1]
    set -l prompt (interpolate $name 2>&1 | string collect)
    if test $pipestatus[1] -ne 0
        printf '%s\n' $prompt >&2
        return 1
    end

    if functions -q __agent_a_base
        __agent_a_base $rest -- "$prompt"
    else
        agent $rest -- "$prompt"
    end
end
