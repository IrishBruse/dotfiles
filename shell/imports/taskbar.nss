menu(type="*" expanded=true)
{
	item(pos=pos.middle title='Restart Explorer' sep=top image=icon.refresh type='Taskbar' cmd-line='/k taskkill /f /im explorer.exe & start explorer.exe & exit')
	item(pos=pos.middle title='Settings' sep=bottom image=icon.settings type='Taskbar' cmd='ms-settings:')

	item(pos=pos.bottom title='Enviroment Vars' image=icon.manage type='Taskbar' cmd='C:/Windows/system32/rundll32.exe' args='sysdm.cpl,EditEnvironmentVariables')
	item(pos=pos.bottom title='Task Manager' image=icon.task_manager type='Taskbar' cmd='Taskmgr.exe')
}

modify(vis=vis.remove type="Taskbar" mode=mode.multiple menu=title.more_options find='Task Manager')

// Move to more options
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Toolbars')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Search')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Show window*')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Show task')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Show people')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Taskbar settings')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Show touch')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Show the desk')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Cascade windows')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Exit Explorer')
modify(mode=mode.multiple type="Taskbar" menu=title.more_options find='Lock all taskbars')
