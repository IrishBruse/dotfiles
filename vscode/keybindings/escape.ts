export const escape = [
  {
    key: "escape",
    command: "closeReferenceSearch",
    when: "inReferenceSearchEditor && !config.editor.stablePeek",
  },
  {
    key: "escape",
    command: "editor.action.inlineSuggest.hide",
    when: "inInlineEditsPreviewEditor",
  },
  {
    key: "escape",
    command: "editor.closeTestPeek",
    when: "testing.isInPeek && !config.editor.stablePeek || testing.isPeekVisible && !config.editor.stablePeek",
  },
  {
    key: "escape",
    command: "cancelSelection",
    when: "editorHasSelection && textInputFocus",
  },
  {
    key: "escape",
    command: "removeSecondaryCursors",
    when: "editorHasMultipleSelections && textInputFocus",
  },
  {
    key: "escape",
    command: "notebook.cell.chat.acceptChanges",
    when: "inlineChatFocused && notebookCellChatFocused && notebookChatUserDidEdit && !notebookCellEditorFocused",
  },
  {
    key: "escape",
    command: "inlineChat.hideHint",
    when: "inlineChatShowingHint",
  },
  {
    key: "escape",
    command: "notebook.cell.quitEdit",
    when: "inputFocus && notebookEditorFocused && !editorHasMultipleSelections && !editorHasSelection && !editorHoverVisible && !inlineChatFocused",
  },
  {
    key: "escape",
    command: "closeBreakpointWidget",
    when: "breakpointWidgetVisible && textInputFocus",
  },
  {
    key: "escape",
    command: "editor.action.cancelSelectionAnchor",
    when: "editorTextFocus && selectionAnchorSet",
  },
  {
    key: "escape",
    command: "editor.action.hideColorPicker",
    when: "standaloneColorPickerVisible",
  },
  {
    key: "escape",
    command: "editor.action.selectEditor",
    when: "stickyScrollFocused",
  },
  {
    key: "escape",
    command: "editor.action.webvieweditor.hideFind",
    when: "webviewFindWidgetVisible && !editorFocus && activeEditor == 'WebviewEditor'",
  },
  {
    key: "escape",
    command: "editor.cancelOperation",
    when: "cancellableOperation",
  },
  {
    key: "escape",
    command: "editor.debug.action.closeExceptionWidget",
    when: "exceptionWidgetVisible",
  },
  {
    key: "escape",
    command: "editor.gotoNextSymbolFromResult.cancel",
    when: "hasSymbols",
  },
  {
    key: "escape",
    command: "editor.hideDropWidget",
    when: "dropWidgetVisible",
  },
  {
    key: "escape",
    command: "editor.hidePasteWidget",
    when: "pasteWidgetVisible",
  },
  {
    key: "escape",
    command: "inlayHints.stopReadingLineWithHint",
    when: "isReadingLineWithInlayHints",
  },
  {
    key: "escape",
    command: "inlineChat.discardHunkChange",
    when: "inlineChatHasProvider && inlineChatVisible && inlineChatResponseType == 'messagesAndEdits'",
  },
  {
    key: "escape",
    command: "notebook.cell.chat.discard",
    when: "inlineChatFocused && notebookCellChatFocused && !notebookCellEditorFocused && !notebookChatUserDidEdit",
  },
  {
    key: "escape",
    command: "search.action.focusQueryEditorWidget",
    when: "inSearchEditor",
  },
  {
    key: "escape",
    command: "settings.action.clearSearchResults",
    when: "inSettingsEditor && inSettingsSearch",
  },
  {
    key: "escape",
    command: "welcome.goBack",
    when: "inWelcome && activeEditor == 'gettingStartedPage'",
  },
  {
    key: "escape",
    command: "workbench.action.hideComment",
    when: "commentEditorFocused || commentFocused",
  },
  {
    key: "escape",
    command: "inlineChat.close",
    when: "inlineChatHasProvider && inlineChatVisible",
  },
  {
    key: "escape",
    command: "closeFindWidget",
    when: "editorFocus && findWidgetVisible && !isComposing",
  },
  { key: "escape", command: "leaveEditorMessage", when: "messageVisible" },
  {
    key: "escape",
    command: "leaveSnippet",
    when: "inSnippetMode && textInputFocus",
  },
  {
    key: "escape",
    command: "closeMarkersNavigation",
    when: "editorFocus && markersNavigationVisible",
  },
  { key: "escape", command: "closeQuickDiff", when: "dirtyDiffVisible" },
  {
    key: "escape",
    command: "notifications.hideToasts",
    when: "notificationToastsVisible",
  },
  {
    key: "escape",
    command: "closeParameterHints",
    when: "editorFocus && parameterHintsVisible",
  },
  {
    key: "escape",
    command: "editor.action.inlineSuggest.hide",
    when: "inlineEditIsVisible || inlineSuggestionVisible",
  },
  {
    key: "escape",
    command: "hideSuggestWidget",
    when: "suggestWidgetVisible && textInputFocus",
  },
  {
    key: "escape",
    command: "cancelLinkedEditingInput",
    when: "LinkedEditingInputVisible && editorTextFocus",
  },
  {
    key: "escape",
    command: "cancelRenameInput",
    when: "editorFocus && renameInputVisible",
  },
  {
    key: "escape",
    command: "closeReplaceInFilesWidget",
    when: "replaceInputBoxFocus && searchViewletVisible",
  },
  {
    key: "escape",
    command: "commentsClearFilterText",
    when: "commentsFilterFocus",
  },
  {
    key: "escape",
    command: "inlineChat2.stop",
    when: "inlineChatHasEditsAgent && inlineChatVisible",
  },
  {
    key: "escape",
    command: "keybindings.editor.clearSearchResults",
    when: "inKeybindings && inKeybindingsSearch",
  },
  {
    key: "escape",
    command: "keybindings.editor.rejectWhenExpression",
    when: "inKeybindings && whenFocus && !suggestWidgetVisible",
  },
  {
    key: "escape",
    command: "list.clear",
    when: "listFocus && listHasSelectionOrFocus && !inputFocus && !treestickyScrollFocused",
  },
  {
    key: "escape",
    command: "list.closeFind",
    when: "listFocus && treeFindOpen",
  },
  {
    key: "escape",
    command: "noteMultiCursor.exit",
    when: "config.notebook.multiCursor.enabled && isNotebookMultiSelect && activeEditor == 'workbench.editor.notebook'",
  },
  {
    key: "escape",
    command: "notebook.hideFind",
    when: "notebookEditorFocused && notebookFindWidgetFocused",
  },
  {
    key: "escape",
    command: "problems.action.clearFilterText",
    when: "problemsFilterFocus",
  },
  {
    key: "escape",
    command: "scm.clearInput",
    when: "scmRepository && !suggestWidgetVisible",
  },
  {
    key: "escape",
    command: "search.action.cancel",
    when: "listFocus && searchViewletVisible && !inputFocus && !treestickyScrollFocused && searchState != '0'",
  },
  {
    key: "escape",
    command: "settings.action.focusLevelUp",
    when: "inSettingsEditor && !inSettingsJSONEditor && !inSettingsSearch",
  },
  {
    key: "escape",
    command: "workbench.action.closeQuickOpen",
    when: "inQuickOpen",
  },
  {
    key: "escape",
    command: "workbench.action.terminal.chat.close",
    when: "terminalChatFocus && terminalChatVisible || terminalChatVisible && terminalFocus",
  },
  {
    key: "escape",
    command: "workbench.action.terminal.clearSelection",
    when: "terminalFocusInAny && terminalHasBeenCreated && terminalTextSelected && !terminalFindVisible || terminalFocusInAny && terminalProcessSupported && terminalTextSelected && !terminalFindVisible",
  },
  {
    key: "escape",
    command: "workbench.action.terminal.hideFind",
    when: "terminalFindVisible && terminalFocusInAny && terminalHasBeenCreated || terminalFindVisible && terminalFocusInAny && terminalProcessSupported",
  },
  {
    key: "escape",
    command: "workbench.actions.workbench.panel.output.clearFilterText",
    when: "outputFilterFocus",
  },
  {
    key: "escape",
    command: "workbench.banner.focusBanner",
    when: "bannerFocused",
  },
  {
    key: "escape",
    command: "workbench.statusBar.clearFocus",
    when: "statusBarFocused",
  },
  {
    key: "escape",
    command: "breadcrumbs.selectEditor",
    when: "breadcrumbsActive && breadcrumbsVisible",
  },
  {
    key: "escape",
    command: "workbench.action.terminal.hideSuggestWidget",
    when: "terminalFocus && terminalHasBeenCreated && terminalIsOpen && terminalSuggestWidgetVisible || terminalFocus && terminalIsOpen && terminalProcessSupported && terminalSuggestWidgetVisible",
  },
  {
    key: "escape",
    command: "notebook.cell.quitEdit",
    when: "notebookEditorFocused && notebookOutputFocused",
  },
  {
    key: "escape",
    command: "editor.closeCallHierarchy",
    when: "callHierarchyVisible && !config.editor.stablePeek",
  },
  {
    key: "escape",
    command: "editor.closeTypeHierarchy",
    when: "typeHierarchyVisible && !config.editor.stablePeek",
  },
  {
    key: "escape",
    command: "filesExplorer.cancelCut",
    when: "explorerResourceCut && filesExplorerFocus && foldersViewVisible && !inputFocus",
  },
  {
    key: "escape",
    command: "closeReferenceSearch",
    when: "editorTextFocus && referenceSearchVisible && !config.editor.stablePeek || referenceSearchVisible && !config.editor.stablePeek && !inputFocus",
  },
  {
    key: "escape",
    command: "notifications.hideList",
    when: "notificationCenterVisible",
  },
  {
    key: "escape",
    command: "notifications.hideToasts",
    when: "notificationFocus && notificationToastsVisible",
  },
  {
    key: "escape",
    command: "workbench.action.chat.stopListening",
    when: "voiceChatInProgress && scopedVoiceChatInProgress == 'editor' || voiceChatInProgress && scopedVoiceChatInProgress == 'inline' || voiceChatInProgress && scopedVoiceChatInProgress == 'quick' || voiceChatInProgress && scopedVoiceChatInProgress == 'view'",
  },
  {
    key: "escape",
    command: "workbench.action.chat.stopReadChatItemAloud",
    when: "scopedChatSynthesisInProgress",
  },
  {
    key: "escape",
    command: "workbench.action.editorDictation.stop",
    when: "editorDictation.inProgress",
  },
  {
    key: "escape",
    command: "workbench.action.speech.stopReadAloud",
    when: "scopedChatSynthesisInProgress && textToSpeechInProgress",
  },
  {
    key: "escape",
    command: "hideCodeActionWidget",
    when: "codeActionMenuVisible",
  },
  {
    key: "escape",
    command: "diffEditor.exitCompareMove",
    when: "comparingMovedCode",
  },
];
