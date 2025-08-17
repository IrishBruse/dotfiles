import type { Keybind } from "./gen";

export default [
  // LSP
  {
    key: "f2",
    command: "editor.action.rename",
    when: "editorHasRenameProvider && editorTextFocus && !editorReadonly",
  },
  {
    key: "f3",
    command: "references-view.findImplementations",
  },
  {
    key: "f4",
    command: "references-view.findReferences",
  },
  {
    command: "workbench.action.debug.restart",
    key: "f5",
    when: "inDebugMode && debugState == 'running'",
  },
  {
    key: "ctrl+space",
    command: "editor.action.triggerSuggest",
    when: "editorHasCompletionItemProvider && textInputFocus && !editorReadonly && !suggestWidgetVisible",
  },
  // Misc
  {
    key: "ctrl+shift+s",
    command: "saveAll",
  },
  {
    key: "ctrl+a",
    command: "editor.action.smartSelect.grow",
    when: "editorTextFocus",
  },
  {
    key: "ctrl+shift+a",
    command: "editor.action.selectAll",
    when: "editorTextFocus",
  },
  {
    key: "ctrl+i",
    command: "editor.action.insertSnippet",
  },
  { command: "workbench.action.previousEditorInGroup", key: "alt+left" },
  { command: "workbench.action.nextEditorInGroup", key: "alt+right" },
  { command: "workbench.action.toggleSidebarVisibility", key: "ctrl+oem_8" },
  { command: "workbench.action.files.saveWithoutFormatting", key: "alt+s" },
  { command: "workbench.action.toggleZenMode", key: "f11" },
  { command: "workbench.action.openSettingsJson", key: "ctrl+shift+e" },
  { command: "notebook.execute", key: "f5", when: "notebookEditorFocused" },
  {
    command: "testing.runCurrentFile",
    key: "f5",
    when: "testing.activeEditorHasTests",
  },
  {
    command: "testing.debugCurrentFile",
    key: "ctrl+f5",
    when: "testing.activeEditorHasTests",
  },
  { command: "workbench.action.closeOtherEditors", key: "ctrl+shift+w" },
  {
    command: "editor.action.jumpToBracket",
    key: "ctrl+b",
    when: "editorTextFocus && editorLangId!=markdown",
  },
  {
    command: "workbench.action.quickOpenNavigateNextInViewPicker",
    key: "ctrl+tab",
    when: "inQuickOpen && inViewsPicker",
  },
  {
    command: "workbench.action.quickOpenView",
    key: "ctrl+tab",
    when: "!inQuickOpen",
  },
  { command: "workbench.action.focusActiveEditorGroup", key: "ctrl+e" },
  {
    command: "workbench.action.quickOpenNavigatePreviousInViewPicker",
    key: "ctrl+shift+tab",
    when: "inQuickOpen && inViewsPicker",
  },
  {
    command: "editor.action.marker.nextInFiles",
    key: "ctrl+e",
    when: "editorFocus",
  },
  {
    command: "editor.action.marker.prevInFiles",
    key: "ctrl+shift+e",
    when: "editorFocus",
  },
  {
    command: "editor.action.goToImplementation",
    key: "alt+enter",
    when: "editorHasImplementationProvider && editorTextFocus && !isInEmbeddedEditor",
  },
  {
    command: "editor.action.autoFix",
    key: "ctrl+shift+oem_period",
    when: "textInputFocus && !editorReadonly && supportedCodeAction =~ /(\\s|^)quickfix\\b/",
  },

  {
    command: "workbench.action.terminal.killEditor",
    key: "ctrl+w",
    when: "terminalFocus",
  },
  {
    command: "editor.action.showHover",
    key: "shift+space",
    when: "editorTextFocus",
  },
  { command: "workbench.action.terminal.toggleTerminal", key: "ctrl+oem_5" },
  { command: "workbench.action.terminal.clear", key: "ctrl+k" },
  {
    command: "editor.action.insertCursorAbove",
    key: "shift+alt+up",
    when: "editorTextFocus",
  },
  {
    command: "editor.action.insertCursorBelow",
    key: "shift+alt+down",
    when: "editorTextFocus",
  },
  {
    command: "workbench.action.terminal.openNativeConsole",
    key: "ctrl+t",
  },
  {
    command: "workbench.action.terminal.paste",
    key: "ctrl+v",
    when: "terminalFocus && terminalHasBeenCreated || terminalFocus && terminalProcessSupported",
  },
  { command: "editor.action.goToTypeDefinition", key: "f1" },
  {
    command: "toggle",
    key: "ctrl+shift+i",
    when: "editorTextFocus",
    args: {
      id: "minimap",
      value: [
        {
          "editor.inlayHints.enabled": "onUnlessPressed",
        },
        {
          "editor.inlayHints.enabled": "offUnlessPressed",
        },
      ],
    },
  },
  {
    command: "toggle",
    key: "ctrl+shift+l",
    when: "editorTextFocus",
    args: {
      id: "minimap",
      value: [
        {
          "editor.lineNumbers": "off",
        },
        {
          "editor.lineNumbers": "on",
        },
      ],
    },
  },
  {
    when: "terminalFocus",
    key: "ctrl+left",
    command: "workbench.action.terminal.sendSequence",
    args: { text: "\u001b[1;5D" },
  },
  {
    when: "terminalFocus",
    key: "ctrl+right",
    command: "workbench.action.terminal.sendSequence",
    args: { text: "\u001b[1;5C" },
  },
  {
    when: "terminalFocus",
    key: "ctrl+alt+left",
    command: "workbench.action.terminal.sendSequence",
    args: { text: "\u001b[1;5D" },
  },
  {
    when: "terminalFocus",
    key: "ctrl+r",
    command: "workbench.action.terminal.sendSequence",
    args: { text: "\u0012" },
  },
  {
    when: "!terminalFocus",
    key: "ctrl+r",
    command: "workbench.files.action.showActiveFileInExplorer",
  },
  {
    key: "ctrl+q",
    command: "git.openChange",
    when: "editorFocus && !isInDiffEditor",
  },
  {
    key: "ctrl+q",
    command: "git.openFile",
    when: "editorFocus && isInDiffEditor",
  },
  // Duplicate selection
  {
    key: "ctrl+d",
    command: "editor.action.addSelectionToNextFindMatch",
    when: "editorFocus",
  },
  {
    key: "ctrl+shift+d",
    command: "editor.action.selectHighlights",
    when: "editorFocus",
  },
  // Open side bars
  {
    key: "ctrl+shift+e",
    command: "workbench.view.explorer",
    when: "!filesExplorerFocus",
  },
  {
    key: "ctrl+shift+e",
    command: "workbench.action.closeSidebar",
    when: "filesExplorerFocus",
  },
  {
    key: "ctrl+g",
    command: "workbench.view.scm",
    when: "!workbench.scm.active",
  },
  {
    key: "ctrl+g",
    command: "workbench.action.closeSidebar",
    when: "workbench.scm.active",
  },
  // Terminal
  {
    key: "ctrl+c",
    command: "workbench.action.terminal.sendSequence",
    args: { text: "\u0003" },
    when: "terminalFocus",
  },
  {
    key: "ctrl+c",
    command: "workbench.action.terminal.copySelection",
    when: "terminalTextSelectedInFocused",
  },
] as Keybind[];
