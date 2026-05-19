function a --wraps agent --description 'agent (a !template runs interpolate)'
    if __a_try_interpolate $argv
        return $status
    end
    agent $argv
end
