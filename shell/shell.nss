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
        item(vis=vis.remove find='View')
        item(vis=vis.remove find='Sort by')
        item(vis=vis.remove find='Group by')
        item(vis=vis.remove find='Git')
        item(vis=vis.remove find='Paste')
        item(vis=vis.remove find='Undo Delete')
        item(vis=vis.remove find='Scan with defender')
        item(vis=vis.remove find='Git')
        item(vis=vis.remove find='Test')
        item(vis=vis.remove find='Give Access to')
        item(vis=vis.remove find='Customise this folder*')
        item(vis=vis.remove find='Scan With Microsoft *')
        item(vis=vis.remove find='Open With Visual Studio')
        item(vis=vis.remove find='Edit')
        item(vis=vis.remove find='Share')
        item(vis=vis.remove find='"Open in new window"')

        item(vis=vis.remove find='Rich Text Document')
        item(vis=vis.remove find='Pin to Quick access')
        item(vis=vis.remove find='Pin to Start')
        item(vis=vis.remove find='Send to')
        item(vis=vis.remove find='Include in library')

	    item(mode=mode.multiple where=this.id(id.restore_previous_versions,id.cast_to_device) vis=vis.remove)

        // Hide shortcuts
        item(vis=vis.remove find='Delete')
        item(vis=vis.remove find='Rename')
        item(vis=vis.remove find='Copy')
        item(vis=vis.remove find='Cut')
        item(vis=vis.remove find='Redo')
        item(vis=vis.remove find='Paste')

        item(pos=pos.middle find='*')

        item(image=\uE136 pos=pos.bottom title="File Lockpick" find="What's using this file?")
        item(pos=pos.bottom sep=sep.top find='Refresh')
        item(pos=pos.bottom find='Properties')

        item(pos=pos.top find='Open')

        item(find='Folder' image=icon.new_folder sep="none")
        item(find='Text Document' image=icon.new_file sep="none")

        // Remove Taskbar
        item(type='Taskbar' vis=vis.remove find='Toolbars')
        item(type='Taskbar' vis=vis.remove find='Search')
        item(type='Taskbar' vis=vis.remove find='Show window*')
        item(type='Taskbar' vis=vis.remove find='Show task')
        item(type='Taskbar' vis=vis.remove find='Show people')
        item(type='Taskbar' vis=vis.remove find='Taskbar settings')
        item(type='Taskbar' vis=vis.remove find='Show touch')
        item(type='Taskbar' vis=vis.remove find='Show the desk')
        item(type='Taskbar' vis=vis.remove find='Cascade windows')
        item(type='Taskbar' vis=vis.remove find='Lock all taskbars')
        item(type='Taskbar' vis=vis.remove find='Task Manager')

        item(type='Taskbar' pos=0 find='Task manager')
        item(type='Taskbar' pos=0 find='Taskbar settings')
    }

    dynamic
    {
        // item(title="New Folder" image=icon.new_folder cmd=io.dir.create pos=pos.top sep=sep.bottom)
        // item(title="New File" image=icon.new_file cmd=io.file.create('@(dt).txt', 'Hello World!') pos=pos.top)

        item(title='Add to @sel.parent.name .zip' mode='multiple' image=icon.compressed type='file|dir' cmd='7zG' args='a -tzip @sel.parent.name .zip @sel(true," ")')

        item(title='Enviroment Vars' image=icon.manage type='Taskbar' pos=0 cmd='C:/Windows/system32/rundll32.exe' args='sysdm.cpl,EditEnvironmentVariables')
        item(title='Task Manager' image=icon.task_manager type='Taskbar' pos=0 cmd='Taskmgr.exe')
        item(title='Settings' image=icon.settings type='Taskbar' pos=-102 cmd='ms-settings:')
        item(title='Restart Explorer' image=icon.refresh type='Taskbar' pos=-104 cmd-line='/k taskkill /f /im explorer.exe & start explorer.exe & exit')

        menu(title='Dotnet' type="back.dir" sep=sep.bottom image=\uE24C pos=pos.middle)
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
