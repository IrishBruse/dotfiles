# Fish completion script for OpenSpec CLI
# Auto-generated - do not edit manually

# Helper function to check if a subcommand is present
function __fish_openspec_using_subcommand
    set -l cmd (commandline -opc)
    set -e cmd[1]
    for i in $argv
        if contains -- $i $cmd
            return 0
        end
    end
    return 1
end

function __fish_openspec_no_subcommand
    set -l cmd (commandline -opc)
    test (count $cmd) -eq 1
end
# Dynamic completion helpers

function __fish_openspec_changes
    openspec __complete changes 2>/dev/null | while read -l id desc
        printf '%s\t%s\n' "$id" "$desc"
    end
end

function __fish_openspec_specs
    openspec __complete specs 2>/dev/null | while read -l id desc
        printf '%s\t%s\n' "$id" "$desc"
    end
end

function __fish_openspec_items
    __fish_openspec_changes
    __fish_openspec_specs
end

function __fish_openspec_schemas
    openspec __complete schemas 2>/dev/null | while read -l id desc
        printf '%s\t%s\n' "$id" "$desc"
    end
end
# init command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'init' -d 'Initialize OpenSpec in your project'
# update command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'update' -d 'Update OpenSpec instruction files'
# list command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'list' -d 'List items (changes by default, or specs with --specs)'
# view command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'view' -d 'Display an interactive dashboard of specs and changes'
# validate command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'validate' -d 'Validate changes and specs'
# show command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'show' -d 'Show a change or spec'
# archive command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'archive' -d 'Archive a completed change and update main specs'
# status command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'status' -d 'Display artifact completion status for a change'
# instructions command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'instructions' -d 'Output enriched instructions for creating an artifact or applying tasks'
# templates command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'templates' -d 'Show resolved template paths for all artifacts in a schema'
# schemas command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'schemas' -d 'List available workflow schemas with descriptions'
# new command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'new' -d 'Create new items'
# set command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'set' -d 'Set checked-in OpenSpec metadata'
# workspace command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'workspace' -d 'Set up and inspect coordination workspaces'
# context-store command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'context-store' -d 'Set up and inspect context stores'
# initiative command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'initiative' -d 'Create and list coordinated initiatives'
# feedback command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'feedback' -d 'Submit feedback about OpenSpec'
# change command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'change' -d 'Manage OpenSpec change proposals (deprecated)'
# spec command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'spec' -d 'Manage OpenSpec specifications'
# completion command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'completion' -d 'Manage shell completions for OpenSpec CLI'
# config command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'config' -d 'View and modify global OpenSpec configuration'
# schema command
complete -c openspec -n '__fish_openspec_no_subcommand' -a 'schema' -d 'Manage workflow schemas'

# init flags
complete -c openspec -n '__fish_openspec_using_subcommand init' -l tools -r -d 'Configure AI tools non-interactively (e.g., "all", "none", or comma-separated tool IDs)'
complete -c openspec -n '__fish_openspec_using_subcommand init' -l force -d 'Auto-cleanup legacy files without prompting'
complete -c openspec -n '__fish_openspec_using_subcommand init' -l profile -a 'core' -d 'Override global config profile (core or custom)'
complete -c openspec -n '__fish_openspec_using_subcommand init' -l profile -a 'custom' -d 'Override global config profile (core or custom)'

# update flags
complete -c openspec -n '__fish_openspec_using_subcommand update' -l force -d 'Force update even when tools are up to date'

# list flags
complete -c openspec -n '__fish_openspec_using_subcommand list' -l specs -d 'List specs instead of changes'
complete -c openspec -n '__fish_openspec_using_subcommand list' -l changes -d 'List changes explicitly (default)'
complete -c openspec -n '__fish_openspec_using_subcommand list' -l sort -a 'recent' -d 'Sort order: "recent" (default) or "name"'
complete -c openspec -n '__fish_openspec_using_subcommand list' -l sort -a 'name' -d 'Sort order: "recent" (default) or "name"'
complete -c openspec -n '__fish_openspec_using_subcommand list' -l json -d 'Output as JSON'

# view flags

# validate flags
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l all -d 'Validate all changes and specs'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l changes -d 'Validate all changes'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l specs -d 'Validate all specs'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l type -a 'change' -d 'Specify item type when ambiguous'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l type -a 'spec' -d 'Specify item type when ambiguous'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l strict -d 'Enable strict validation mode'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l json -d 'Output validation results as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l concurrency -r -d 'Max concurrent validations (defaults to env OPENSPEC_CONCURRENCY or 6)'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -l no-interactive -d 'Disable interactive prompts'
complete -c openspec -n '__fish_openspec_using_subcommand validate' -a '(__fish_openspec_items)' -f

# show flags
complete -c openspec -n '__fish_openspec_using_subcommand show' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l type -a 'change' -d 'Specify item type when ambiguous'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l type -a 'spec' -d 'Specify item type when ambiguous'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l no-interactive -d 'Disable interactive prompts'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l deltas-only -d 'Show only deltas (JSON only, change-specific)'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l requirements-only -d 'Alias for --deltas-only (deprecated, change-specific)'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l requirements -d 'Show only requirements, exclude scenarios (JSON only, spec-specific)'
complete -c openspec -n '__fish_openspec_using_subcommand show' -l no-scenarios -d 'Exclude scenario content (JSON only, spec-specific)'
complete -c openspec -n '__fish_openspec_using_subcommand show' -s r -l requirement -r -d 'Show specific requirement by ID (JSON only, spec-specific)'
complete -c openspec -n '__fish_openspec_using_subcommand show' -a '(__fish_openspec_items)' -f

# archive flags
complete -c openspec -n '__fish_openspec_using_subcommand archive' -s y -l yes -d 'Skip confirmation prompts'
complete -c openspec -n '__fish_openspec_using_subcommand archive' -l skip-specs -d 'Skip spec update operations'
complete -c openspec -n '__fish_openspec_using_subcommand archive' -l no-validate -d 'Skip validation (not recommended)'
complete -c openspec -n '__fish_openspec_using_subcommand archive' -a '(__fish_openspec_changes)' -f

# status flags
complete -c openspec -n '__fish_openspec_using_subcommand status' -l change -r -d 'Change name to show status for'
complete -c openspec -n '__fish_openspec_using_subcommand status' -l schema -r -d 'Schema override'
complete -c openspec -n '__fish_openspec_using_subcommand status' -l json -d 'Output as JSON'

# instructions flags
complete -c openspec -n '__fish_openspec_using_subcommand instructions' -l change -r -d 'Change name'
complete -c openspec -n '__fish_openspec_using_subcommand instructions' -l schema -r -d 'Schema override'
complete -c openspec -n '__fish_openspec_using_subcommand instructions' -l json -d 'Output as JSON'

# templates flags
complete -c openspec -n '__fish_openspec_using_subcommand templates' -l schema -r -d 'Schema to use'
complete -c openspec -n '__fish_openspec_using_subcommand templates' -l json -d 'Output as JSON'

# schemas flags
complete -c openspec -n '__fish_openspec_using_subcommand schemas' -l json -d 'Output as JSON'

complete -c openspec -n '__fish_openspec_using_subcommand new; and not __fish_openspec_using_subcommand change' -a 'change' -d 'Create a new change directory'

# new change flags
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l description -r -d 'Description to add to README.md'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l goal -r -d 'Workspace product goal to store with the change'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l areas -r -d 'Comma-separated affected workspace link names'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l initiative -r -d 'Link the repo-local change to an initiative'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l store -r -d 'Context store id for --initiative'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l store-path -r -d 'Existing local context store root for --initiative'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l schema -r -d 'Workflow schema to use'
complete -c openspec -n '__fish_openspec_using_subcommand new; and __fish_openspec_using_subcommand change' -l json -d 'Output as JSON'

complete -c openspec -n '__fish_openspec_using_subcommand set; and not __fish_openspec_using_subcommand change' -a 'change' -d 'Set repo-local change metadata'

# set change flags
complete -c openspec -n '__fish_openspec_using_subcommand set; and __fish_openspec_using_subcommand change' -l initiative -r -d 'Link the repo-local change to an initiative'
complete -c openspec -n '__fish_openspec_using_subcommand set; and __fish_openspec_using_subcommand change' -l store -r -d 'Context store id for --initiative'
complete -c openspec -n '__fish_openspec_using_subcommand set; and __fish_openspec_using_subcommand change' -l store-path -r -d 'Existing local context store root for --initiative'
complete -c openspec -n '__fish_openspec_using_subcommand set; and __fish_openspec_using_subcommand change' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand set; and __fish_openspec_using_subcommand change' -a '(__fish_openspec_changes)' -f

complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand setup' -a 'setup' -d 'Set up a workspace and link existing repos or folders'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand list' -a 'list' -d 'List known OpenSpec workspaces'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand ls' -a 'ls' -d 'List known OpenSpec workspaces'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand link' -a 'link' -d 'Link an existing repo or folder to a workspace'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand relink' -a 'relink' -d 'Update the local path for an existing workspace link'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand doctor' -a 'doctor' -d 'Check what a workspace can resolve on this machine'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand update' -a 'update' -d 'Refresh workspace-local OpenSpec guidance and agent skills'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and not __fish_openspec_using_subcommand open' -a 'open' -d 'Open a workspace in an agent or VS Code editor'

# workspace setup flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l name -r -d 'Workspace name'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l link -r -d 'Repo or folder link. Use <path> or <name>=<path>'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l opener -a 'codex-cli' -d 'Preferred opener: codex-cli, claude, github-copilot, or editor'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l opener -a 'claude' -d 'Preferred opener: codex-cli, claude, github-copilot, or editor'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l opener -a 'github-copilot' -d 'Preferred opener: codex-cli, claude, github-copilot, or editor'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l opener -a 'editor' -d 'Preferred opener: codex-cli, claude, github-copilot, or editor'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l tools -r -d 'Install OpenSpec skills for agents (all, none, or comma-separated tool IDs)'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand setup' -l no-interactive -d 'Disable interactive prompts'
# workspace list flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand list' -l json -d 'Output as JSON'
# workspace ls flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand ls' -l json -d 'Output as JSON'
# workspace link flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand link' -l workspace -r -d 'Workspace name from local workspace views'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand link' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand link' -l no-interactive -d 'Disable interactive prompts'
# workspace relink flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand relink' -l workspace -r -d 'Workspace name from local workspace views'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand relink' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand relink' -l no-interactive -d 'Disable interactive prompts'
# workspace doctor flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand doctor' -l workspace -r -d 'Workspace name from local workspace views'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand doctor' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand doctor' -l no-interactive -d 'Disable interactive prompts'
# workspace update flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand update' -l workspace -r -d 'Workspace name from local workspace views'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand update' -l tools -r -d 'Select agents for workspace skills-only delivery; global profile selects workflows'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand update' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand update' -l no-interactive -d 'Disable interactive prompts'
# workspace open flags
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l workspace -r -d 'Workspace name from local workspace views'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l initiative -r -d 'Open an initiative as a local workspace view'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l store -r -d 'Context store id for --initiative'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l store-path -r -d 'Existing local context store root for --initiative'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l agent -a 'codex-cli' -d 'Use an agent for this session: codex-cli, claude, or github-copilot'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l agent -a 'claude' -d 'Use an agent for this session: codex-cli, claude, or github-copilot'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l agent -a 'github-copilot' -d 'Use an agent for this session: codex-cli, claude, or github-copilot'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l editor -d 'Open the workspace in VS Code editor mode'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l prepare-only -d 'Unsupported: preview surfaces belong to a future context/query command'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l change -r -d 'Unsupported: change-scoped open belongs to future workspace change planning'
complete -c openspec -n '__fish_openspec_using_subcommand workspace; and __fish_openspec_using_subcommand open' -l no-interactive -d 'Disable interactive prompts'

complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand setup' -a 'setup' -d 'Create or register a local context store'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand register' -a 'register' -d 'Register an existing context store directory'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand unregister' -a 'unregister' -d 'Forget a local context-store registration without deleting files'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand remove' -a 'remove' -d 'Forget a local context-store registration and delete its local folder'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand list' -a 'list' -d 'List registered context stores'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand ls' -a 'ls' -d 'List registered context stores'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and not __fish_openspec_using_subcommand doctor' -a 'doctor' -d 'Check local context-store registration and metadata'

# context-store setup flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand setup' -l path -r -d 'Directory to use for the context store'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand setup' -l init-git -d 'Initialize a Git repository in the context store'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand setup' -l no-init-git -d 'Skip Git repository initialization'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand setup' -l json -d 'Output as JSON'
# context-store register flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand register' -l id -r -d 'Context store id'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand register' -l json -d 'Output as JSON'
# context-store unregister flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand unregister' -l json -d 'Output as JSON'
# context-store remove flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand remove' -l yes -d 'Confirm local context-store folder deletion'
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand remove' -l json -d 'Output as JSON'
# context-store list flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand list' -l json -d 'Output as JSON'
# context-store ls flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand ls' -l json -d 'Output as JSON'
# context-store doctor flags
complete -c openspec -n '__fish_openspec_using_subcommand context-store; and __fish_openspec_using_subcommand doctor' -l json -d 'Output as JSON'

complete -c openspec -n '__fish_openspec_using_subcommand initiative; and not __fish_openspec_using_subcommand create' -a 'create' -d 'Create an initiative in a context store'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and not __fish_openspec_using_subcommand show' -a 'show' -d 'Show where an initiative lives and how to read it'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and not __fish_openspec_using_subcommand list' -a 'list' -d 'List initiatives across registered context stores'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and not __fish_openspec_using_subcommand ls' -a 'ls' -d 'List initiatives across registered context stores'

# initiative create flags
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand create' -l store -r -d 'Context store id from the local context-store registry'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand create' -l store-path -r -d 'Existing local context store root'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand create' -l title -r -d 'Initiative title'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand create' -l summary -r -d 'Initiative summary'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand create' -l json -d 'Output as JSON'
# initiative show flags
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand show' -l store -r -d 'Context store id from the local context-store registry'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand show' -l store-path -r -d 'Existing local context store root'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand show' -l json -d 'Output as JSON'
# initiative list flags
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand list' -l store -r -d 'Context store id from the local context-store registry'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand list' -l store-path -r -d 'Existing local context store root'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand list' -l json -d 'Output as JSON'
# initiative ls flags
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand ls' -l store -r -d 'Context store id from the local context-store registry'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand ls' -l store-path -r -d 'Existing local context store root'
complete -c openspec -n '__fish_openspec_using_subcommand initiative; and __fish_openspec_using_subcommand ls' -l json -d 'Output as JSON'

# feedback flags
complete -c openspec -n '__fish_openspec_using_subcommand feedback' -l body -r -d 'Detailed description for the feedback'

complete -c openspec -n '__fish_openspec_using_subcommand change; and not __fish_openspec_using_subcommand show' -a 'show' -d 'Show a change proposal'
complete -c openspec -n '__fish_openspec_using_subcommand change; and not __fish_openspec_using_subcommand list' -a 'list' -d 'List all active changes (deprecated)'
complete -c openspec -n '__fish_openspec_using_subcommand change; and not __fish_openspec_using_subcommand validate' -a 'validate' -d 'Validate a change proposal'

# change show flags
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand show' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand show' -l deltas-only -d 'Show only deltas (JSON only)'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand show' -l requirements-only -d 'Alias for --deltas-only (deprecated)'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand show' -l no-interactive -d 'Disable interactive prompts'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand show' -a '(__fish_openspec_changes)' -f
# change list flags
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand list' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand list' -l long -d 'Show id and title with counts'
# change validate flags
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand validate' -l strict -d 'Enable strict validation mode'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand validate' -l json -d 'Output validation results as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand validate' -l no-interactive -d 'Disable interactive prompts'
complete -c openspec -n '__fish_openspec_using_subcommand change; and __fish_openspec_using_subcommand validate' -a '(__fish_openspec_changes)' -f

complete -c openspec -n '__fish_openspec_using_subcommand spec; and not __fish_openspec_using_subcommand show' -a 'show' -d 'Show a specification'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and not __fish_openspec_using_subcommand list' -a 'list' -d 'List all specifications'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and not __fish_openspec_using_subcommand validate' -a 'validate' -d 'Validate a specification'

# spec show flags
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand show' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand show' -l requirements -d 'Show only requirements, exclude scenarios (JSON only)'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand show' -l no-scenarios -d 'Exclude scenario content (JSON only)'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand show' -s r -l requirement -r -d 'Show specific requirement by ID (JSON only)'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand show' -l no-interactive -d 'Disable interactive prompts'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand show' -a '(__fish_openspec_specs)' -f
# spec list flags
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand list' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand list' -l long -d 'Show id and title with counts'
# spec validate flags
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand validate' -l strict -d 'Enable strict validation mode'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand validate' -l json -d 'Output validation results as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand validate' -l no-interactive -d 'Disable interactive prompts'
complete -c openspec -n '__fish_openspec_using_subcommand spec; and __fish_openspec_using_subcommand validate' -a '(__fish_openspec_specs)' -f

complete -c openspec -n '__fish_openspec_using_subcommand completion; and not __fish_openspec_using_subcommand generate' -a 'generate' -d 'Generate completion script for a shell (outputs to stdout)'
complete -c openspec -n '__fish_openspec_using_subcommand completion; and not __fish_openspec_using_subcommand install' -a 'install' -d 'Install completion script for a shell'
complete -c openspec -n '__fish_openspec_using_subcommand completion; and not __fish_openspec_using_subcommand uninstall' -a 'uninstall' -d 'Uninstall completion script for a shell'

# completion generate flags
complete -c openspec -n '__fish_openspec_using_subcommand completion; and __fish_openspec_using_subcommand generate' -a 'zsh bash fish powershell' -f
# completion install flags
complete -c openspec -n '__fish_openspec_using_subcommand completion; and __fish_openspec_using_subcommand install' -l verbose -d 'Show detailed installation output'
complete -c openspec -n '__fish_openspec_using_subcommand completion; and __fish_openspec_using_subcommand install' -a 'zsh bash fish powershell' -f
# completion uninstall flags
complete -c openspec -n '__fish_openspec_using_subcommand completion; and __fish_openspec_using_subcommand uninstall' -s y -l yes -d 'Skip confirmation prompts'
complete -c openspec -n '__fish_openspec_using_subcommand completion; and __fish_openspec_using_subcommand uninstall' -a 'zsh bash fish powershell' -f

complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand path' -a 'path' -d 'Show config file location'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand list' -a 'list' -d 'Show all current settings'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand get' -a 'get' -d 'Get a specific value (raw, scriptable)'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand set' -a 'set' -d 'Set a value (auto-coerce types)'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand unset' -a 'unset' -d 'Remove a key (revert to default)'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand reset' -a 'reset' -d 'Reset configuration to defaults'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand edit' -a 'edit' -d 'Open config in \$EDITOR'
complete -c openspec -n '__fish_openspec_using_subcommand config; and not __fish_openspec_using_subcommand profile' -a 'profile' -d 'Configure workflow profile (interactive picker or preset shortcut)'

complete -c openspec -n '__fish_openspec_using_subcommand config' -l scope -a 'global' -d 'Config scope (only "global" supported currently)'
# config path flags
# config list flags
complete -c openspec -n '__fish_openspec_using_subcommand config; and __fish_openspec_using_subcommand list' -l json -d 'Output as JSON'
# config get flags
# config set flags
complete -c openspec -n '__fish_openspec_using_subcommand config; and __fish_openspec_using_subcommand set' -l string -d 'Force value to be stored as string'
complete -c openspec -n '__fish_openspec_using_subcommand config; and __fish_openspec_using_subcommand set' -l allow-unknown -d 'Allow setting unknown keys'
# config unset flags
# config reset flags
complete -c openspec -n '__fish_openspec_using_subcommand config; and __fish_openspec_using_subcommand reset' -l all -d 'Reset all configuration (required)'
complete -c openspec -n '__fish_openspec_using_subcommand config; and __fish_openspec_using_subcommand reset' -s y -l yes -d 'Skip confirmation prompts'
# config edit flags
# config profile flags

complete -c openspec -n '__fish_openspec_using_subcommand schema; and not __fish_openspec_using_subcommand which' -a 'which' -d 'Show where a schema resolves from'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and not __fish_openspec_using_subcommand validate' -a 'validate' -d 'Validate a schema structure and templates'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and not __fish_openspec_using_subcommand fork' -a 'fork' -d 'Copy an existing schema to project for customization'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and not __fish_openspec_using_subcommand init' -a 'init' -d 'Create a new project-local schema'

# schema which flags
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand which' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand which' -l all -d 'List all schemas with their resolution sources'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand which' -a '(__fish_openspec_schemas)' -f
# schema validate flags
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand validate' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand validate' -l verbose -d 'Show detailed validation steps'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand validate' -a '(__fish_openspec_schemas)' -f
# schema fork flags
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand fork' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand fork' -l force -d 'Overwrite existing destination'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand fork' -a '(__fish_openspec_schemas)' -f
# schema init flags
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand init' -l json -d 'Output as JSON'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand init' -l description -r -d 'Schema description'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand init' -l artifacts -r -d 'Comma-separated artifact IDs'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand init' -l default -d 'Set as project default schema'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand init' -l no-default -d 'Do not prompt to set as default'
complete -c openspec -n '__fish_openspec_using_subcommand schema; and __fish_openspec_using_subcommand init' -l force -d 'Overwrite existing schema'

