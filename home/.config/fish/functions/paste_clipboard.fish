function paste_clipboard --description 'Paste clipboard text or save an image and insert its path'
    set -l stamp (date +%Y%m%d%H%M%S)
    set -l dest "$PWD/clipboard-$stamp.png"

    switch (uname -s)
        case Linux
            if set -q WAYLAND_DISPLAY; or test "$XDG_SESSION_TYPE" = wayland
                if command -q wl-paste
                    set -l types (wl-paste --list-types 2>/dev/null)
                    if string match -qr 'image/' -- $types
                        if wl-paste --type image/png >$dest 2>/dev/null
                            and test -s $dest
                            commandline -i -- (string escape -- $dest)
                            return
                        end
                        if wl-paste >$dest 2>/dev/null
                            and test -s $dest
                            commandline -i -- (string escape -- $dest)
                            return
                        end
                        rm -f $dest
                    end
                end
            else if set -q DISPLAY; and command -q xclip
                if xclip -selection clipboard -t image/png -o >$dest 2>/dev/null
                    and test -s $dest
                    commandline -i -- (string escape -- $dest)
                    return
                end
                rm -f $dest
            end
        case Darwin
            if command -q pngpaste
                set -l info (osascript -e 'clipboard info' 2>/dev/null)
                if string match -qr '«class (PNGf|JPEG|GIFf|TIFF|PICT|BMPf)»' -- $info
                    if pngpaste $dest 2>/dev/null
                        and test -s $dest
                        commandline -i -- (string escape -- $dest)
                        return
                    end
                    rm -f $dest
                end
            end
    end

    fish_clipboard_paste
end
