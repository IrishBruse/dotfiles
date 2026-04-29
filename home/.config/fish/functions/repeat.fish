function repeat -a command time
    if not set -q time[1]
        set time 1
    end
    while true
        fish -c $command
        sleep $time
    end
end
