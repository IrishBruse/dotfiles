
using namespace System.Management.Automation
using namespace System.Management.Automation.Language

Register-ArgumentCompleter -Native -CommandName 'ferium' -ScriptBlock {
    param($wordToComplete, $commandAst, $cursorPosition)

    $commandElements = $commandAst.CommandElements
    $command = @(
        'ferium'
        for ($i = 1; $i -lt $commandElements.Count; $i++) {
            $element = $commandElements[$i]
            if ($element -isnot [StringConstantExpressionAst] -or
                $element.StringConstantType -ne [StringConstantType]::BareWord -or
                $element.Value.StartsWith('-') -or
                $element.Value -eq $wordToComplete) {
                break
        }
        $element.Value
    }) -join ';'

    $completions = @(switch ($command) {
        'ferium' {
            [CompletionResult]::new('-t', 't', [CompletionResultType]::ParameterName, 'The limit for additional threads spawned by the Tokio runtime')
            [CompletionResult]::new('--threads', 'threads', [CompletionResultType]::ParameterName, 'The limit for additional threads spawned by the Tokio runtime')
            [CompletionResult]::new('--github-token', 'github-token', [CompletionResultType]::ParameterName, 'Set a GitHub personal access token for increasing the GitHub API rate limit. You can also use the environment variable `GITHUB_TOKEN`')
            [CompletionResult]::new('--curseforge-api-key', 'curseforge-api-key', [CompletionResultType]::ParameterName, 'Set a custom CurseForge API key. You can also use the environment variable `CURSEFORGE_API_KEY`')
            [CompletionResult]::new('--config-file', 'config-file', [CompletionResultType]::ParameterName, 'Set the file to read the config from. Does not change the cache and tmp directories')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('add', 'add', [CompletionResultType]::ParameterValue, 'Add a mod to the profile')
            [CompletionResult]::new('complete', 'complete', [CompletionResultType]::ParameterValue, 'Generate shell auto completions to stdout for the specified shell')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the mods in the profile, and with some their metadata if verbose')
            [CompletionResult]::new('modpack', 'modpack', [CompletionResultType]::ParameterValue, 'Add, configure, delete, switch, list, or upgrade modpacks')
            [CompletionResult]::new('profile', 'profile', [CompletionResultType]::ParameterValue, 'Create, configure, delete, switch, or list profiles')
            [CompletionResult]::new('remove', 'remove', [CompletionResultType]::ParameterValue, 'Remove a mod or repository from the profile')
            [CompletionResult]::new('upgrade', 'upgrade', [CompletionResultType]::ParameterValue, 'Download and install the latest version of the mods specified')
            [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print this message or the help of the given subcommand(s)')
            break
        }
        'ferium;add' {
            [CompletionResult]::new('--dependencies', 'dependencies', [CompletionResultType]::ParameterName, 'Select which dependencies should be added')
            [CompletionResult]::new('--dont-check-game-version', 'dont-check-game-version', [CompletionResultType]::ParameterName, 'The game version will not be checked for this mod')
            [CompletionResult]::new('--dont-check-mod-loader', 'dont-check-mod-loader', [CompletionResultType]::ParameterName, 'The mod loader will not be checked for this mod')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;complete' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;list' {
            [CompletionResult]::new('-v', 'v', [CompletionResultType]::ParameterName, 'Show information about the mod')
            [CompletionResult]::new('--verbose', 'verbose', [CompletionResultType]::ParameterName, 'Show information about the mod')
            [CompletionResult]::new('--markdown', 'markdown', [CompletionResultType]::ParameterName, 'Output information in markdown format and alphabetical order')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('add', 'add', [CompletionResultType]::ParameterValue, 'Add a modpack to the config')
            [CompletionResult]::new('configure', 'configure', [CompletionResultType]::ParameterValue, 'Configure the current modpack''s output directory')
            [CompletionResult]::new('delete', 'delete', [CompletionResultType]::ParameterValue, 'Delete a modpack')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the modpacks')
            [CompletionResult]::new('switch', 'switch', [CompletionResultType]::ParameterValue, 'Switch between different modpacks')
            [CompletionResult]::new('upgrade', 'upgrade', [CompletionResultType]::ParameterValue, 'Download and install the latest version of the modpack')
            [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print this message or the help of the given subcommand(s)')
            break
        }
        'ferium;modpack;add' {
            [CompletionResult]::new('--output-dir', 'output-dir', [CompletionResultType]::ParameterName, 'The Minecraft instance directory to install the modpack to')
            [CompletionResult]::new('--install-overrides', 'install-overrides', [CompletionResultType]::ParameterName, 'Whether to install the modpack''s overrides to the output directory')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack;configure' {
            [CompletionResult]::new('--output-dir', 'output-dir', [CompletionResultType]::ParameterName, 'The Minecraft instance directory to install the modpack to')
            [CompletionResult]::new('--install-overrides', 'install-overrides', [CompletionResultType]::ParameterName, 'Whether to install the modpack''s overrides to the output directory')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack;delete' {
            [CompletionResult]::new('--modpack-name', 'modpack-name', [CompletionResultType]::ParameterName, 'The name of the modpack to delete')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack;list' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack;switch' {
            [CompletionResult]::new('--modpack-name', 'modpack-name', [CompletionResultType]::ParameterName, 'The name of the modpack to switch to')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack;upgrade' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;modpack;help' {
            [CompletionResult]::new('add', 'add', [CompletionResultType]::ParameterValue, 'Add a modpack to the config')
            [CompletionResult]::new('configure', 'configure', [CompletionResultType]::ParameterValue, 'Configure the current modpack''s output directory')
            [CompletionResult]::new('delete', 'delete', [CompletionResultType]::ParameterValue, 'Delete a modpack')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the modpacks')
            [CompletionResult]::new('switch', 'switch', [CompletionResultType]::ParameterValue, 'Switch between different modpacks')
            [CompletionResult]::new('upgrade', 'upgrade', [CompletionResultType]::ParameterValue, 'Download and install the latest version of the modpack')
            [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print this message or the help of the given subcommand(s)')
            break
        }
        'ferium;modpack;help;add' {
            break
        }
        'ferium;modpack;help;configure' {
            break
        }
        'ferium;modpack;help;delete' {
            break
        }
        'ferium;modpack;help;list' {
            break
        }
        'ferium;modpack;help;switch' {
            break
        }
        'ferium;modpack;help;upgrade' {
            break
        }
        'ferium;modpack;help;help' {
            break
        }
        'ferium;profile' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('configure', 'configure', [CompletionResultType]::ParameterValue, 'Configure the current profile''s Minecraft version, mod loader, and output directory')
            [CompletionResult]::new('create', 'create', [CompletionResultType]::ParameterValue, 'Create a new profile')
            [CompletionResult]::new('delete', 'delete', [CompletionResultType]::ParameterValue, 'Delete a profile')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the profiles with their data')
            [CompletionResult]::new('switch', 'switch', [CompletionResultType]::ParameterValue, 'Switch between different profiles')
            [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print this message or the help of the given subcommand(s)')
            break
        }
        'ferium;profile;configure' {
            [CompletionResult]::new('--game-version', 'game-version', [CompletionResultType]::ParameterName, 'The Minecraft version to check compatibility for')
            [CompletionResult]::new('--mod-loader', 'mod-loader', [CompletionResultType]::ParameterName, 'The mod loader to check compatibility for')
            [CompletionResult]::new('--name', 'name', [CompletionResultType]::ParameterName, 'The name of the profile')
            [CompletionResult]::new('--output-dir', 'output-dir', [CompletionResultType]::ParameterName, 'The directory to output mods to')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;profile;create' {
            [CompletionResult]::new('--import', 'import', [CompletionResultType]::ParameterName, 'Copy over the mods from an existing profile')
            [CompletionResult]::new('--game-version', 'game-version', [CompletionResultType]::ParameterName, 'The Minecraft version to check compatibility for')
            [CompletionResult]::new('--mod-loader', 'mod-loader', [CompletionResultType]::ParameterName, 'The mod loader to check compatibility for')
            [CompletionResult]::new('--name', 'name', [CompletionResultType]::ParameterName, 'The name of the profile')
            [CompletionResult]::new('--output-dir', 'output-dir', [CompletionResultType]::ParameterName, 'The directory to output mods to')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;profile;delete' {
            [CompletionResult]::new('--profile-name', 'profile-name', [CompletionResultType]::ParameterName, 'The name of the profile to delete')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;profile;list' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;profile;switch' {
            [CompletionResult]::new('--profile-name', 'profile-name', [CompletionResultType]::ParameterName, 'The name of the profile to switch to')
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;profile;help' {
            [CompletionResult]::new('configure', 'configure', [CompletionResultType]::ParameterValue, 'Configure the current profile''s Minecraft version, mod loader, and output directory')
            [CompletionResult]::new('create', 'create', [CompletionResultType]::ParameterValue, 'Create a new profile')
            [CompletionResult]::new('delete', 'delete', [CompletionResultType]::ParameterValue, 'Delete a profile')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the profiles with their data')
            [CompletionResult]::new('switch', 'switch', [CompletionResultType]::ParameterValue, 'Switch between different profiles')
            [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print this message or the help of the given subcommand(s)')
            break
        }
        'ferium;profile;help;configure' {
            break
        }
        'ferium;profile;help;create' {
            break
        }
        'ferium;profile;help;delete' {
            break
        }
        'ferium;profile;help;list' {
            break
        }
        'ferium;profile;help;switch' {
            break
        }
        'ferium;profile;help;help' {
            break
        }
        'ferium;remove' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help (see more with ''--help'')')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;upgrade' {
            [CompletionResult]::new('-h', 'h', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('--help', 'help', [CompletionResultType]::ParameterName, 'Print help')
            [CompletionResult]::new('-V', 'V', [CompletionResultType]::ParameterName, 'Print version')
            [CompletionResult]::new('--version', 'version', [CompletionResultType]::ParameterName, 'Print version')
            break
        }
        'ferium;help' {
            [CompletionResult]::new('add', 'add', [CompletionResultType]::ParameterValue, 'Add a mod to the profile')
            [CompletionResult]::new('complete', 'complete', [CompletionResultType]::ParameterValue, 'Generate shell auto completions to stdout for the specified shell')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the mods in the profile, and with some their metadata if verbose')
            [CompletionResult]::new('modpack', 'modpack', [CompletionResultType]::ParameterValue, 'Add, configure, delete, switch, list, or upgrade modpacks')
            [CompletionResult]::new('profile', 'profile', [CompletionResultType]::ParameterValue, 'Create, configure, delete, switch, or list profiles')
            [CompletionResult]::new('remove', 'remove', [CompletionResultType]::ParameterValue, 'Remove a mod or repository from the profile')
            [CompletionResult]::new('upgrade', 'upgrade', [CompletionResultType]::ParameterValue, 'Download and install the latest version of the mods specified')
            [CompletionResult]::new('help', 'help', [CompletionResultType]::ParameterValue, 'Print this message or the help of the given subcommand(s)')
            break
        }
        'ferium;help;add' {
            break
        }
        'ferium;help;complete' {
            break
        }
        'ferium;help;list' {
            break
        }
        'ferium;help;modpack' {
            [CompletionResult]::new('add', 'add', [CompletionResultType]::ParameterValue, 'Add a modpack to the config')
            [CompletionResult]::new('configure', 'configure', [CompletionResultType]::ParameterValue, 'Configure the current modpack''s output directory')
            [CompletionResult]::new('delete', 'delete', [CompletionResultType]::ParameterValue, 'Delete a modpack')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the modpacks')
            [CompletionResult]::new('switch', 'switch', [CompletionResultType]::ParameterValue, 'Switch between different modpacks')
            [CompletionResult]::new('upgrade', 'upgrade', [CompletionResultType]::ParameterValue, 'Download and install the latest version of the modpack')
            break
        }
        'ferium;help;modpack;add' {
            break
        }
        'ferium;help;modpack;configure' {
            break
        }
        'ferium;help;modpack;delete' {
            break
        }
        'ferium;help;modpack;list' {
            break
        }
        'ferium;help;modpack;switch' {
            break
        }
        'ferium;help;modpack;upgrade' {
            break
        }
        'ferium;help;profile' {
            [CompletionResult]::new('configure', 'configure', [CompletionResultType]::ParameterValue, 'Configure the current profile''s Minecraft version, mod loader, and output directory')
            [CompletionResult]::new('create', 'create', [CompletionResultType]::ParameterValue, 'Create a new profile')
            [CompletionResult]::new('delete', 'delete', [CompletionResultType]::ParameterValue, 'Delete a profile')
            [CompletionResult]::new('list', 'list', [CompletionResultType]::ParameterValue, 'List all the profiles with their data')
            [CompletionResult]::new('switch', 'switch', [CompletionResultType]::ParameterValue, 'Switch between different profiles')
            break
        }
        'ferium;help;profile;configure' {
            break
        }
        'ferium;help;profile;create' {
            break
        }
        'ferium;help;profile;delete' {
            break
        }
        'ferium;help;profile;list' {
            break
        }
        'ferium;help;profile;switch' {
            break
        }
        'ferium;help;remove' {
            break
        }
        'ferium;help;upgrade' {
            break
        }
        'ferium;help;help' {
            break
        }
    })

    $completions.Where{ $_.CompletionText -like "$wordToComplete*" } |
        Sort-Object -Property ListItemText
}
