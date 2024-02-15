menu(title='Dotnet' image=\uE24C pos=indexof("New",1,pos.middle))
{
    item(title='run' cmd="wezterm" args='start -- dotnet run' image=\uE149)
    item(title='clean' image=\uE0CE cmd='wezterm' args='start -- dotnet clean')
    item(title='serve' image=\ue11f cmd='wezterm' args='start -- dotnet serve -o -p 42069')
    separator
    item(title='build debug' cmd="wezterm" args='start -- dotnet build')
    item(title='build release' cmd="wezterm" args='start -- dotnet build -c release /p:DebugType=None')

    menu(mode='multiple' sep='both' title='publish' )
    {
        $publish='dotnet publish -r win-x64 -c release --output @sel.parent/publish /p:CopyOutputSymbolsToPublishDirectory=false'
        item(title='publish sinale file' sep='after' cmd="wezterm" args='start -- @publish -p:PublishSingleFile=true --self-contained false')
        item(title='framework-dependent deployment' cmd="wezterm" args='start -- @publish')
        item(title='framework-dependent executable' cmd="wezterm" args='start -- @publish --self-contained false')
        item(title='self-contained deployment' cmd="wezterm" args='start -- @publish --self-contained true')
        item(title='single-file' cmd="wezterm" args='start -- @publish /p:PublishSingleFile=true /p:PublishTrimmed=false')
        item(title='single-file-trimmed' cmd="wezterm" args='start -- @publish /p:PublishSingleFile=true /p:PublishTrimmed=true')
    }
    separator
    item(title='help' image=\uE136 cmd="wezterm" args='start -- "dotnet -h"')
    item(title='version' cmd="wezterm" args='start -- "dotnet --info"')
}

menu(mode="multiple" type="*" sep=sep.none title=title.more_options image=icon.more_options pos=indexof("Dotnet",1,pos.top)) { }
