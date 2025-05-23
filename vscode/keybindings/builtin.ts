import type { Keybind } from "./gen";

export default [
  {
    key: "alt+backspace",
    command: "deleteWordLeft",
    when: "textInputFocus && !editorReadonly && isMac",
  },
  {
    key: "alt+delete",
    command: "deleteWordRight",
    when: "textInputFocus && !editorReadonly && isMac",
  },
  // Cursor
  { key: "ctrl+left", command: "cursorWordLeft", when: "textInputFocus" },
  { key: "ctrl+right", command: "cursorWordRight", when: "textInputFocus" },
  { key: "up", command: "cursorUp", when: "textInputFocus" },
  { key: "down", command: "cursorDown", when: "textInputFocus" },
  { key: "left", command: "cursorLeft", when: "textInputFocus" },
  { key: "right", command: "cursorRight", when: "textInputFocus" },
  //
  {
    key: "ctrl+f",
    command: "actions.find",
    when: "editorFocus || editorIsOpen",
  },
] as Keybind[];
