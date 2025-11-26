#!/usr/bin/env fish

if test (uname) = Linux
    command stow .
end

if test (uname) = Darwin
    command stow .
end
