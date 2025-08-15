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
  {
    key: "alt+up",
    command: "deleteWordRight",
    when: "textInputFocus && !editorReadonly && isMac",
  },
  {
    key: "ctrl+shift+x",
    command: "workbench.view.extensions",
    when: "viewContainer.workbench.view.extensions.enabled",
  },
  {
    key: "ctrl+shift+f",
    command: "workbench.view.search",
  },
  {
    key: "ctrl+shift+p",
    command: "workbench.action.showCommands",
  },
  {
    key: "ctrl+p",
    command: "workbench.action.quickOpen",
  },
  {
    key: "enter",
    command: "editor.action.nextMatchFindAction",
    when: "editorFocus && findInputFocussed",
  },
  { key: "ctrl+a", command: "editor.action.selectAll" },
  { key: "backspace", command: "deleteLeft", when: "textInputFocus" },
  { key: "delete", command: "deleteRight", when: "textInputFocus" },
  // Copy cut & paste
  { key: "ctrl+c", command: "editor.action.clipboardCopyAction" },
  { key: "ctrl+v", command: "editor.action.clipboardPasteAction" },
  { key: "ctrl+x", command: "editor.action.clipboardCutAction" },
  // Cursor
  { key: "ctrl+left", command: "cursorWordLeft", when: "textInputFocus" },
  { key: "ctrl+right", command: "cursorWordRight", when: "textInputFocus" },
  { key: "up", command: "cursorUp", when: "textInputFocus" },
  { key: "down", command: "cursorDown", when: "textInputFocus" },
  { key: "left", command: "cursorLeft", when: "textInputFocus" },
  { key: "right", command: "cursorRight", when: "textInputFocus" },
  {
    key: "home",
    command: "cursorHome",
    when: "textInputFocus",
  },
  {
    key: "end",
    command: "cursorEnd",
    when: "textInputFocus",
  },
  // Close
  {
    key: "escape",
    command: "closeFindWidget",
    when: "editorFocus && findWidgetVisible && !isComposing",
  },
  {
    key: "escape",
    command: "removeSecondaryCursors",
    when: "editorHasMultipleSelections && textInputFocus",
  },
  {
    key: "escape",
    command: "editor.action.cancelSelectionAnchor",
    when: "editorTextFocus && selectionAnchorSet",
  },
  {
    key: "escape",
    command: "cancelSelection",
    when: "editorHasSelection && textInputFocus",
  },
  // Selection
  {
    key: "shift+up",
    command: "cursorColumnSelectUp",
    when: "editorColumnSelection && textInputFocus",
  },
  {
    key: "shift+down",
    command: "cursorColumnSelectDown",
    when: "editorColumnSelection && textInputFocus",
  },
  { key: "shift+up", command: "cursorUpSelect", when: "textInputFocus" },
  { key: "shift+down", command: "cursorDownSelect", when: "textInputFocus" },
  { key: "shift+end", command: "cursorEndSelect", when: "textInputFocus" },
  { key: "shift+home", command: "cursorHomeSelect", when: "textInputFocus" },
  { key: "shift+left", command: "cursorLeftSelect", when: "textInputFocus" },
  { key: "shift+right", command: "cursorRightSelect", when: "textInputFocus" },
  {
    key: "ctrl+shift+left",
    command: "cursorWordLeftSelect",
    when: "textInputFocus",
  },
  {
    key: "ctrl+shift+right",
    command: "cursorWordRightSelect",
    when: "textInputFocus",
  },
  // Find
  {
    key: "ctrl+f",
    command: "actions.find",
    when: "editorFocus || editorIsOpen",
  },
  {
    key: "ctrl+f",
    command: "settings.action.search",
    when: "inSettingsEditor",
  },
  {
    key: "tab",
    command: "editor.action.inlineSuggest.jump",
    when: "inlineEditIsVisible && tabShouldJumpToInlineEdit && !editorHoverFocused && !editorTabMovesFocus && !suggestWidgetVisible",
  },
  {
    key: "tab",
    command: "jumpToNextSnippetPlaceholder",
    when: "hasNextTabstop && inSnippetMode && textInputFocus",
  },
  {
    key: "shift+tab",
    command: "jumpToPrevSnippetPlaceholder",
    when: "hasPrevTabstop && inSnippetMode && textInputFocus",
  },
  // Common keybinds
  { key: "ctrl+z", command: "undo" },
  { key: "ctrl+shift+z", command: "redo" },
  { key: "ctrl+s", command: "workbench.action.files.save" },
  { key: "ctrl+w", command: "workbench.action.closeActiveEditor" },
  {
    key: "alt+up",
    command: "editor.action.moveLinesUpAction",
    when: "editorTextFocus && !editorReadonly",
  },
  {
    key: "alt+down",
    command: "editor.action.moveLinesDownAction",
    when: "editorTextFocus && !editorReadonly",
  },
  {
    key: "enter",
    command: "acceptSelectedSuggestion",
    when: "acceptSuggestionOnEnter && suggestWidgetHasFocusedSuggestion && suggestWidgetVisible && suggestionMakesTextEdit && textInputFocus",
  },
  {
    key: "enter",
    command: "acceptSelectedCodeAction",
    when: "codeActionMenuVisible",
  },
  {
    key: "enter",
    command: "acceptRenameInput",
    when: "editorFocus && renameInputVisible && !isComposing",
  },
  {
    key: "up",
    command: "list.focusUp",
    when: "listFocus && !inputFocus && !treestickyScrollFocused",
  },
  {
    key: "down",
    command: "list.focusDown",
    when: "listFocus && !inputFocus && !treestickyScrollFocused",
  },
  {
    key: "down",
    command: "quickInput.next",
    when: "inQuickInput && quickInputType == 'quickPick'",
  },
  {
    key: "up",
    command: "quickInput.previous",
    when: "inQuickInput && quickInputType == 'quickPick'",
  },
  {
    key: "up",
    command: "selectPrevSuggestion",
    when: "suggestWidgetMultipleSuggestions && suggestWidgetVisible && textInputFocus || suggestWidgetVisible && textInputFocus && !suggestWidgetHasFocusedSuggestion",
  },
  {
    key: "down",
    command: "selectNextSuggestion",
    when: "suggestWidgetMultipleSuggestions && suggestWidgetVisible && textInputFocus || suggestWidgetVisible && textInputFocus && !suggestWidgetHasFocusedSuggestion",
  },
  {
    key: "ctrl+/",
    command: "editor.action.commentLine",
  },
] as Keybind[];
