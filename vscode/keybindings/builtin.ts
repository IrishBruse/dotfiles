import type { Keybind } from "./gen";

export default [
  {
    key: "alt+backspace",
    command: "deleteWordLeft",
    when: "textInputFocus && !editorReadonly && isMac",
  },
  {
    key: "ctrl+backspace",
    command: "deleteWordLeft",
    when: "textInputFocus && !editorReadonly",
  },
  {
    key: "alt+delete",
    command: "deleteWordRight",
    when: "textInputFocus && !editorReadonly && isMac",
  },
  {
    key: "ctrl+delete",
    command: "deleteWordRight",
    when: "textInputFocus && !editorReadonly",
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
    command: "workbench.action.findInFiles",
  },
  {
    key: "ctrl+backspace",
    command: "deleteWordLeft",
    when: "textInputFocus && !editorReadonly",
  },
  {
    key: "ctrl+delete",
    command: "deleteWordRight",
    when: "textInputFocus && !editorReadonly",
  },

  {
    key: "ctrl+enter",
    command: "editor.action.insertLineAfter",
    when: "editorTextFocus && !editorReadonly",
  },
  {
    key: "ctrl+shift+enter",
    command: "editor.action.insertLineBefore",
    when: "editorTextFocus && !editorReadonly",
  },
  {
    key: "ctrl+shift+p",
    command: "workbench.action.showCommands",
  },
  { key: "shift+backspace", command: "deleteLeft", when: "textInputFocus" },
  { key: "backspace", command: "deleteLeft", when: "textInputFocus" },
  { key: "delete", command: "deleteRight", when: "textInputFocus" },
  { key: "shift+backspace", command: "deleteLeft", when: "textInputFocus" },
  { key: "backspace", command: "deleteLeft", when: "textInputFocus" },
  { key: "delete", command: "deleteRight", when: "textInputFocus" },
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
  // Terminal
  {
    key: "ctrl+backspace",
    command: "workbench.action.terminal.sendSequence",
    when: "terminalFocus",
    args: { text: "\u0017" },
  },
  // {
  //   key: "ctrl+delete",
  //   command: "workbench.action.terminal.sendSequence",
  //   when: "terminalFocus",
  //   args: { text: "\u001bd" },
  // },
  // Copy cut & paste
  {
    key: "ctrl+c",
    command: "editor.action.clipboardCopyAction",
    when: "textInputFocus",
  },
  {
    key: "ctrl+c",
    command: "execCopy",
    when: "isMac",
  },
  {
    key: "ctrl+c",
    command: "search.action.copyMatch",
    when: "fileMatchOrMatchFocus",
  },
  {
    key: "ctrl+c",
    command: "chat.inlineResourceAnchor.copyResource",
    when: "chatAttachmentResource",
  },
  {
    key: "ctrl+v",
    command: "editor.action.clipboardPasteAction",
    when: "textInputFocus",
  },
  {
    key: "ctrl+x",
    command: "editor.action.clipboardCutAction",
    when: "textInputFocus",
  },
  {
    key: "ctrl+c",
    command: "filesExplorer.copy",
    when: "filesExplorerFocus && foldersViewVisible && !explorerResourceIsRoot && !inputFocus",
  },
  {
    key: "ctrl+x",
    command: "filesExplorer.cut",
    when: "filesExplorerFocus && foldersViewVisible && !explorerResourceIsRoot && !explorerResourceReadonly && !inputFocus",
  },
  {
    key: "ctrl+v",
    command: "filesExplorer.paste",
    when: "filesExplorerFocus && foldersViewVisible && !explorerResourceReadonly && !inputFocus",
  },
  {
    key: "ctrl+=",
    command: "workbench.action.zoomIn",
  },
  {
    key: "ctrl+-",
    command: "workbench.action.zoomOut",
  },
  {
    key: "ctrl+0",
    command: "workbench.action.zoomReset",
  },
  // Cursor
  // down

  { key: "down", command: "cursorDown", when: "textInputFocus" },
  {
    key: "down",
    command: "notebook.cell.chat.nextFromHistory",
    when: "inlineChatFocused && notebookCellChatFocused",
  },
  {
    key: "down",
    command: "editor.action.scrollDownHover",
    when: "editorHoverFocused",
  },
  {
    key: "down",
    command: "editor.action.selectNextStickyScrollLine",
    when: "stickyScrollFocused",
  },
  {
    key: "down",
    command: "notebook.focusNextEditor",
    when: "config.notebook.navigation.allowNavigateToSurroundingCells && editorTextFocus && inputFocus && notebookEditorFocused && !accessibilityModeEnabled && !isEmbeddedDiffEditor && notebookEditorCursorAtBoundary != 'none' && notebookEditorCursorAtBoundary != 'top'",
  },
  {
    key: "down",
    command: "settings.action.focusSettingsFile",
    when: "inSettingsSearch && !suggestWidgetVisible",
  },
  {
    key: "down",
    command: "showNextParameterHint",
    when: "editorFocus && parameterHintsMultipleSignatures && parameterHintsVisible",
  },
  {
    key: "down",
    command: "selectNextSuggestion",
    when: "suggestWidgetMultipleSuggestions && suggestWidgetVisible && textInputFocus || suggestWidgetVisible && textInputFocus && !suggestWidgetHasFocusedSuggestion",
  },
  {
    key: "down",
    command: "focusNextRenameSuggestion",
    when: "renameInputVisible",
  },
  {
    key: "down",
    command: "breadcrumbs.selectFocused",
    when: "breadcrumbsActive && breadcrumbsVisible",
  },
  {
    key: "down",
    command: "history.showNext",
    when: "historyNavigationForwardsEnabled && historyNavigationWidgetFocus && !isComposing && !suggestWidgetVisible",
  },
  {
    key: "down",
    command: "iconSelectBox.focusDown",
    when: "iconSelectBoxFocus",
  },
  {
    key: "down",
    command: "interactive.history.next",
    when: "isCompositeNotebook && !notebookEditorFocused && !suggestWidgetVisible && interactiveInputCursorAtBoundary != 'none' && interactiveInputCursorAtBoundary != 'top'",
  },
  {
    key: "down",
    command: "list.focusDown",
    when: "listFocus && !inputFocus && !treestickyScrollFocused",
  },
  {
    key: "down",
    command: "notebook.focusNextEditor",
    when: "config.notebook.navigation.allowNavigateToSurroundingCells && notebookCursorNavigationMode && notebookEditorFocused && !accessibilityModeEnabled && !isEmbeddedDiffEditor && !notebookCellMarkdownEditMode && notebookCellType == 'markup'",
  },
  {
    key: "down",
    command: "notifications.focusNextToast",
    when: "notificationFocus && notificationToastsVisible",
  },
  {
    key: "down",
    command: "quickInput.next",
    when: "inQuickInput && quickInputType == 'quickPick'",
  },
  {
    key: "down",
    command: "scm.viewNextCommit",
    when: "scmInputIsInLastPosition && scmRepository && !suggestWidgetVisible",
  },
  {
    key: "down",
    command: "settings.action.focusSettingsFromSearch",
    when: "inSettingsSearch && !suggestWidgetVisible",
  },
  {
    key: "down",
    command: "workbench.action.interactivePlayground.arrowDown",
    when: "interactivePlaygroundFocus && !editorTextFocus",
  },
  {
    key: "down",
    command: "workbench.banner.focusNextAction",
    when: "bannerFocused",
  },
  {
    key: "down",
    command: "workbench.statusBar.focusNext",
    when: "statusBarFocused",
  },
  {
    key: "down",
    command: "notebook.cell.nullAction",
    when: "notebookOutputInputFocused",
  },
  {
    key: "down",
    command: "workbench.action.terminal.selectNextSuggestion",
    when: "terminalFocus && terminalHasBeenCreated && terminalIsOpen && terminalSuggestWidgetVisible || terminalFocus && terminalIsOpen && terminalProcessSupported && terminalSuggestWidgetVisible",
  },
  {
    key: "down",
    command: "selectNextCodeAction",
    when: "codeActionMenuVisible",
  },
  // up
  { key: "up", command: "cursorUp", when: "textInputFocus" },
  {
    key: "up",
    command: "notebook.cell.chat.previousFromHistory",
    when: "inlineChatFocused && notebookCellChatFocused",
  },
  {
    key: "up",
    command: "editor.action.scrollUpHover",
    when: "editorHoverFocused",
  },
  {
    key: "up",
    command: "editor.action.selectPreviousStickyScrollLine",
    when: "stickyScrollFocused",
  },
  {
    key: "up",
    command: "notebook.focusPreviousEditor",
    when: "config.notebook.navigation.allowNavigateToSurroundingCells && editorTextFocus && inputFocus && notebookEditorFocused && !accessibilityModeEnabled && !isEmbeddedDiffEditor && notebookEditorCursorAtBoundary != 'bottom' && notebookEditorCursorAtBoundary != 'none'",
  },
  {
    key: "up",
    command: "showPrevParameterHint",
    when: "editorFocus && parameterHintsMultipleSignatures && parameterHintsVisible",
  },
  {
    key: "up",
    command: "selectPrevSuggestion",
    when: "suggestWidgetMultipleSuggestions && suggestWidgetVisible && textInputFocus || suggestWidgetVisible && textInputFocus && !suggestWidgetHasFocusedSuggestion",
  },
  {
    key: "up",
    command: "focusPreviousRenameSuggestion",
    when: "renameInputVisible",
  },
  {
    key: "up",
    command: "history.showPrevious",
    when: "historyNavigationBackwardsEnabled && historyNavigationWidgetFocus && !isComposing && !suggestWidgetVisible",
  },
  {
    key: "up",
    command: "iconSelectBox.focusUp",
    when: "iconSelectBoxFocus",
  },
  {
    key: "up",
    command: "interactive.history.previous",
    when: "isCompositeNotebook && !notebookEditorFocused && !suggestWidgetVisible && interactiveInputCursorAtBoundary != 'bottom' && interactiveInputCursorAtBoundary != 'none'",
  },
  {
    key: "up",
    command: "list.focusUp",
    when: "listFocus && !inputFocus && !treestickyScrollFocused",
  },
  {
    key: "up",
    command: "notebook.focusPreviousEditor",
    when: "config.notebook.navigation.allowNavigateToSurroundingCells && notebookCursorNavigationMode && notebookEditorFocused && !accessibilityModeEnabled && !isEmbeddedDiffEditor && !notebookCellMarkdownEditMode && notebookCellType == 'markup'",
  },
  {
    key: "up",
    command: "notifications.focusPreviousToast",
    when: "notificationFocus && notificationToastsVisible",
  },
  {
    key: "up",
    command: "quickInput.previous",
    when: "inQuickInput && quickInputType == 'quickPick'",
  },
  {
    key: "up",
    command: "scm.viewPreviousCommit",
    when: "scmInputIsInFirstPosition && scmRepository && !suggestWidgetVisible",
  },
  {
    key: "up",
    command: "workbench.action.interactivePlayground.arrowUp",
    when: "interactivePlaygroundFocus && !editorTextFocus",
  },
  {
    key: "up",
    command: "workbench.banner.focusPreviousAction",
    when: "bannerFocused",
  },
  {
    key: "up",
    command: "workbench.statusBar.focusPrevious",
    when: "statusBarFocused",
  },
  {
    key: "up",
    command: "notebook.cell.nullAction",
    when: "notebookOutputInputFocused",
  },
  {
    key: "up",
    command: "workbench.action.terminal.selectPrevSuggestion",
    when: "terminalFocus && terminalHasBeenCreated && terminalIsOpen && terminalSuggestWidgetVisible || terminalFocus && terminalIsOpen && terminalProcessSupported && terminalSuggestWidgetVisible",
  },
  {
    key: "up",
    command: "selectPrevCodeAction",
    when: "codeActionMenuVisible",
  },
  //
  { key: "ctrl+left", command: "cursorWordLeft", when: "textInputFocus" },
  { key: "ctrl+right", command: "cursorWordRight", when: "textInputFocus" },
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
  {
    key: "ctrl+shift+enter",
    command: "editor.action.insertLineBefore",
    when: "editorTextFocus && !editorReadonly",
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
    key: "enter",
    command: "keybindings.editor.acceptWhenExpression",
    when: "inKeybindings && whenFocus && !suggestWidgetVisible",
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
  {
    key: "f2",
    command: "renameFile",
    when: "filesExplorerFocus && foldersViewVisible && !explorerResourceIsRoot && !explorerResourceReadonly && !inputFocus",
  },
  {
    key: "delete",
    command: "deleteFile",
    when: "filesExplorerFocus && foldersViewVisible && !explorerResourceMoveableToTrash && !inputFocus",
  },
  {
    key: "tab",
    command: "tab",
    when: "editorTextFocus && !editorReadonly && !editorTabMovesFocus",
  },
  {
    key: "shift+tab",
    command: "outdent",
    when: "editorTextFocus && !editorReadonly && !editorTabMovesFocus",
  },
  // Snippet
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
  {
    key: "ctrl+l",
    command: "editor.action.insertSnippet",
    when: "editorTextFocus",
    args: {
      name: "log",
    },
  },
  {
    key: "ctrl+.",
    command: "editor.action.quickFix",
    when: "editorHasCodeActionsProvider && textInputFocus && !editorReadonly",
  },
  {
    key: "ctrl+.",
    command: "problems.action.showQuickFixes",
    when: "problemFocus",
  },
  {
    key: "ctrl+shift+.",
    command: "editor.action.autoFix",
    when: "textInputFocus && !editorReadonly && supportedCodeAction =~ /(\\s|^)quickfix\\b/",
  },
  // debug
  {
    key: "f5",
    command: "workbench.action.debug.start",
    when: "debuggersAvailable && debugState == 'inactive'",
  },
  {
    key: "f5",
    command: "debug.openView",
    when: "!debuggersAvailable",
  },
  {
    key: "f5",
    command: "workbench.action.debug.continue",
    when: "debugState == 'stopped'",
  },
] as Keybind[];
