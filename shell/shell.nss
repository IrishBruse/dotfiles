shell
{
    images import 'imports/images.nss'

    set
    {
        theme
        {
            name='modern'

            view = view.medium

            dark=true

            background
            {
                color=#1E2224
                effect=0
            }

            image
            {
                align=2
            }

            shadow
            {
                enabled=true
                color=#000000
                opacity=20
                size=5
            }

            separator
            {
                color=#606060
                opacity=100
            }

            item
            {
                prefix=auto

                text
                {
                    normal = #FFFFFF
                    select = #80BA30

                    normal.disabled = #BBBBBB
                    select.disabled = #BBBBBB
                }

                back
                {
                    normal = #1E2224
                    select = #384D20

                    normal.disabled = #1E2224
                    select.disabled = #1E2224
                }

                border
                {
                    normal = #1E2224
                    select = #384D20

                    normal.disabled = #1E2224
                    select.disabled = #1E2224
                }

                padding
                {
                    top = 4
                    bottom = 4
                    left = 16
                    right = 16
                }

                margin
                {
                    top = 2
                    bottom = 2
                    left = 6
                    right = 6
                }
            }
        }
    }

    static
    {
        // remove default items

        item(mode=mode.multiple menu=title.more_options find='Git')
        item(mode=mode.multiple menu=title.more_options find='Scan with defender')
        item(mode=mode.multiple menu=title.more_options find='Test')
        item(mode=mode.multiple menu=title.more_options find='"Undo Delete"')
        item(mode=mode.multiple menu=title.more_options find='Give Access to')
        item(mode=mode.multiple menu=title.more_options find='Customise this folder*')
        item(mode=mode.multiple menu=title.more_options find='Scan With Microsoft *')
        item(mode=mode.multiple menu=title.more_options find='Open With Visual Studio')
        item(mode=mode.multiple menu=title.more_options find='"Open Linux shell here"')

        // Remove Application shortcuts
        item(mode=mode.multiple menu=title.more_options find='Open With Visual Studio')
        item(mode=mode.multiple menu=title.more_options find='Git')

        // New
        item(mode=mode.multiple menu=title.more_options find='Rich Text Document')
        item(mode=mode.multiple menu=title.more_options find='AutoHotKey Script')

        // Drive
        item(mode=mode.multiple menu=title.more_options find='Pin to Quick access')
        item(mode=mode.multiple menu=title.more_options find='Pin to Start')
        item(mode=mode.multiple menu=title.more_options find='Send to')
        item(mode=mode.multiple menu=title.more_options find='Include in library')
	    item(pos=pos.middle mode=mode.multiple where=this.id(
            id.restore_previous_versions,
            id.cast_to_device,
            id.delete,
            id.rename,
            id.copy,
            id.cut,
            id.paste,
            id.paste_shortcut,
            id.edit,
            id.redo,
            id.sort_by,
            id.group_by,
            id.undo,
            id.view,
            id.share,
            id.open_powershell_window_here,
            id.create_shortcut,
            id.create_shortcuts_here,
            id.open_new_window
        ) mode=mode.multiple menu=title.more_options)

        // Reorder items
        item(mode=mode.multiple menu=title.more_options find='"Open"')
        item(pos=-1 sep=None find='*') // Default to middle

        item(pos=top image=\uE272 find='Open with Code')
        item(pos=top image=\uE0AC find='Open Alacritty here')
        item(pos=middle find='"Open With"')

        item(pos=pos.middle image=icon.new_folder sep="none" menu=null find='Folder')
        item(pos=pos.middle image=icon.new_file sep="none" menu=null find='Text Document')
        item(pos=-1 find='Paste Into File')

        item(pos=-1 image=\uE19B title="File Lockpick" find="What's using this file?")
        item(pos=-99 find='Refresh')
        item(pos=-100 find='Properties')

        // Taskbar
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Toolbars')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Search')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Show window*')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Show task')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Show people')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Taskbar settings')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Show touch')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Show the desk')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Cascade windows')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Exit Explorer')
        item(pos=-1 type='Taskbar' mode=mode.multiple menu=title.more_options find='Lock all taskbars')

        // Remove
        item(vis=vis.remove type='Taskbar' mode=mode.multiple menu=title.more_options find='Task Manager')
        item(vis=vis.remove find='Test')

        item(pos=-1 type='Taskbar' find='Task manager')
        item(pos=-1 type='Taskbar' find='Taskbar settings')
    }

    dynamic
    {
		menu(pos=middle type='*' mode=mode.multiple title=title.more_options image=icon.more_options) { }

        item(pos=-1 title='Add to @sel.parent.name .zip' mode='multiple' image=icon.compressed type='file|dir' cmd='7zG' args='a -tzip @sel.parent.name.zip @sel(true," ")')
        item(pos=-1 title='Extract to @sel.title/' where=str.end(sel.name,".zip") image=icon.compressed type='file' cmd='7zG' args=('e -y @sel.name -o@sel.title/'))

        item(pos=8 title='Settings' image=icon.settings type='Taskbar' cmd='ms-settings:')
        item(pos=7 title='Restart Explorer' image=icon.refresh type='Taskbar' cmd-line='/k taskkill /f /im explorer.exe & start explorer.exe & exit')

        item(pos=9 title='Enviroment Vars' image=icon.manage type='Taskbar' cmd='C:/Windows/system32/rundll32.exe' args='sysdm.cpl,EditEnvironmentVariables')
        item(pos=10 title='Task Manager' image=icon.task_manager type='Taskbar' cmd='Taskmgr.exe')

        menu(pos=pos.middle title='Dotnet' type="back.dir" image=\uE24C )
        {
            item(title='run' cmd="alacritty" args='--hold -e "dotnet run"' image=\uE149)
            item(title='clean' image=\uE0CE cmd='alacritty' args='--hold -e "dotnet clean"')
            item(title='serve' image=\ue11f cmd='alacritty' args='--hold -e "dotnet serve -o -p 42069"')
            separator
            item(title='build debug' cmd="alacritty" args='--hold -e "dotnet build"')
            item(title='build release' cmd="alacritty" args='--hold -e "dotnet build -c release /p:DebugType=None"')

            menu(mode='multiple' sep='both' title='publish' )
            {
                var { publish='dotnet publish -r win-x64 -c release --output "@sel.parent/publish" /p:CopyOutputSymbolsToPublishDirectory=false' }
                item(title='publish sinale file' sep='after' cmd="alacritty" args='--hold -e "@publish -p:PublishSingleFile=true --self-contained false"')
                item(title='framework-dependent deployment' cmd="alacritty" args='--hold -e "@publish"')
                item(title='framework-dependent executable' cmd="alacritty" args='--hold -e "@publish --self-contained false"')
                item(title='self-contained deployment' cmd="alacritty" args='--hold -e "@publish --self-contained true"')
                item(title='single-file' cmd="alacritty" args='--hold -e "@publish /p:PublishSingleFile=true /p:PublishTrimmed=false"')
                item(title='single-file-trimmed' cmd="alacritty" args='--hold -e "@publish /p:PublishSingleFile=true /p:PublishTrimmed=true"')
            }
            separator
            item(title='help' image=\uE136 cmd="alacritty" args='--hold -e "dotnet -h"')
            item(title='version' cmd="alacritty" args='--hold -e "dotnet --info"')
        }
    }
}
