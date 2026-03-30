#!/usr/bin/env fish

if test (uname) = Linux
    command stow . --dotfiles
end

if test (uname) = Darwin
    command stow . --dotfiles
end

# ln -s .agents/skills/ .cursor/skills
