shell
{
	set
	{
		theme
		{
			name="modern"

            // view = auto, compact, small, medium, large, wide
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

		showdelay=200
	}

	images import 'imports/images.nss'

	static
	{
		import 'imports/static.nss'

        // remove default items
        item(find="View" vis=vis.remove)
        item(find="Sort by" vis=vis.remove)
        item(find="Group by" vis=vis.remove)
        item(find="Open Alacritty Here" vis=vis.normal)
        item(find="Git" vis=vis.remove)
        item(find="Paste" vis=vis.remove)
        item(find="Undo Delete" vis=vis.remove)
        item(find="Scan with defender" vis=vis.remove)
        item(find="Git" vis=vis.remove)
        item(find="Test" vis=vis.remove) // temp
        item(find="New" vis=vis.remove)
        item(find="Open With Visual Studio" vis=vis.remove)

        // Remove Taskbar
        item(find="Toolbars" type="Taskbar" vis=vis.remove)
        item(find="Search" type="Taskbar" vis=vis.remove)
        item(find="Show window*" type="Taskbar" vis=vis.remove)
        item(find="Show task" type="Taskbar" vis=vis.remove)
        item(find="Show people" type="Taskbar" vis=vis.remove)
        item(find="Taskbar settings" type="Taskbar" vis=vis.remove)
        item(find="Show touch" type="Taskbar" vis=vis.remove)
        item(find="Show the desk" type="Taskbar" vis=vis.remove)
        item(find="Cascade windows" type="Taskbar" vis=vis.remove)
        item(find="Lock all taskbars" type="Taskbar" vis=vis.remove)

        item(find="Task manager" type="Taskbar" pos=0)
        item(find="Taskbar settings" type="Taskbar" pos=0)
	}

	dynamic
	{
        var{ alacritty="alacritty.exe --hold -e"}

        sep
        item(find="Refresh" pos=-1)
        sep
        item(find="Properties" pos=-5)

        item(title="Settings" image=icon.settings type="Taskbar" pos=0 cmd="ms-settings: & exit")
        item(title="Enviroment Vars" image=icon.manage type="Taskbar" pos=0 cmd-line='@alacritty "C:/Windows/system32/rundll32.exe" sysdm.cpl,EditEnvironmentVariables & exit')
        item(title="Restart Explorer" image=icon.refresh type="Taskbar" pos=0 cmd-line="/q /k taskkill /im explorer.exe /f && start explorer.exe & exit")

        menu(mode="multiple" title='&Dotnet' sep=sep.bottom image=\uE26E )
        {
            item(title='run' cmd-line='@alacritty dotnet run' image=\uE149)
            item(title='watch' cmd-line='@alacritty dotnet watch')
            item(title='clean' image=\uE0CE cmd-line='@alacritty "dotnet clean"')
            separator
            item(title='build debug' cmd-line='@alacritty "dotnet build"')
            item(title='build release' cmd-line='@alacritty "dotnet build -c release /p:DebugType=None"')

            menu(mode="multiple" sep="both" title='publish' image=\ue11f)
            {
                var { publish='dotnet publish -r win-x64 -c release --output "@sel.parent\publish" /p:CopyOutputSymbolsToPublishDirectory=false' }
                item(title='publish sinale file' sep="after" cmd-line='@alacritty @publish -p:PublishSingleFile=true --self-contained false')
                item(title='framework-dependent deployment' cmd-line='@alacritty @publish')
                item(title='framework-dependent executable' cmd-line='@alacritty @publish --self-contained false')
                item(title='self-contained deployment' cmd-line='@alacritty @publish --self-contained true')
                item(title='single-file' cmd-line='@alacritty @publish /p:PublishSingleFile=true /p:PublishTrimmed=false')
                item(title='single-file-trimmed' cmd-line='@alacritty @publish /p:PublishSingleFile=true /p:PublishTrimmed=true')
            }
            separator
            item(title='help' image=\uE136 cmd-line='@alacritty dotnet -h')
            item(title='version' cmd-line='@alacritty dotnet --info')
        }
	}
}
