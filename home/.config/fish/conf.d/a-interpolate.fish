# Wrap Cursor shell-integration `a` (if installed after config) so `a !foo` runs interpolate as the agent prompt.
function __fish_wrap_agent_a --on-event fish_prompt
    functions -e __fish_wrap_agent_a
    functions -q a; or return
    functions -q __agent_a_base; and return

    functions -c a __agent_a_base

    function a --description 'agent (+ a !template via interpolate)'
        if __a_try_interpolate $argv
            return $status
        end
        __agent_a_base $argv
    end
end
