function loop
    set -l command $argv[1]
    set -l time 1
    if test (count $argv) -ge 2
        set time $argv[2]
    end
    while true
        fish -c $command
        sleep $time
    end
end
