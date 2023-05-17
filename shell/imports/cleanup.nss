modify(mode=mode.multiple menu=title.more_options find='"Undo Delete"')
modify(mode=mode.multiple menu=title.more_options find='"Open with Visual Studio"')
modify(mode=mode.multiple menu=title.more_options find='"Open with"')
modify(mode=mode.multiple menu=title.more_options find='"Edit with Vim"')

modify(where=this.id(
	id.restore_previous_versions,
	id.cast_to_device,
	id.customize_this_folder,
	id.sort_by,
	id.group_by,
	id.give_access_to,
	id.view,
	id.pin_to_quick_access,
	id.pin_to_start,
	id.include_in_library,
	id.share,
	id.open_powershell_window_here,
	id.open_new_window
) mode=mode.multiple menu=title.more_options)

modify(where=this.id(
	id.create_shortcuts_here,
	id.create_shortcut,
	id.delete,
	id.rename,
	id.copy,
	id.cut,
	id.paste,
	id.send_to,
	id.paste_shortcut,
	id.edit,
	id.redo,
	id.open,
	id.undo
) vis=vis.remove mode=mode.multiple menu=title.more_options)

// Remove
modify(vis=vis.remove find="Scan with Microsoft Defender*")
modify(vis=vis.remove find='"Test"')
modify(vis=vis.remove find='"Git Bash Here"')
modify(vis=vis.remove find='"Git GUI Here"')
modify(vis=vis.remove find='"Customise this folder..."')
modify(vis=vis.remove find='"Open in new window"')
modify(vis=vis.remove find='"Open Linux shell here"')
modify(vis=vis.remove find='"Shortcut"')
modify(vis=vis.remove mode=mode.multiple find='"Rich Text Document"')
modify(vis=vis.remove mode=mode.multiple find='"AutoHotKey Script"')
modify(vis=vis.remove mode=mode.multiple where=this.id(id.open))

modify(pos=pos.middle image=icon.new_folder sep="none" find='Folder')
modify(pos=pos.middle image=icon.new_file sep="none" find='Text Document')
