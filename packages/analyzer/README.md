github-pr-code-smell-detector
=================

React and Next.js Pull Request code smell analyzer


[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/github-pr-code-smell-detector.svg)](https://npmjs.org/package/github-pr-code-smell-detector)
[![Downloads/week](https://img.shields.io/npm/dw/github-pr-code-smell-detector.svg)](https://npmjs.org/package/github-pr-code-smell-detector)


<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g github-pr-code-smell-detector
$ code-smell-detector COMMAND
running command...
$ code-smell-detector (--version)
github-pr-code-smell-detector/0.0.0 win32-x64 node-v22.16.0
$ code-smell-detector --help [COMMAND]
USAGE
  $ code-smell-detector COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`code-smell-detector hello PERSON`](#code-smell-detector-hello-person)
* [`code-smell-detector hello world`](#code-smell-detector-hello-world)
* [`code-smell-detector help [COMMAND]`](#code-smell-detector-help-command)
* [`code-smell-detector plugins`](#code-smell-detector-plugins)
* [`code-smell-detector plugins add PLUGIN`](#code-smell-detector-plugins-add-plugin)
* [`code-smell-detector plugins:inspect PLUGIN...`](#code-smell-detector-pluginsinspect-plugin)
* [`code-smell-detector plugins install PLUGIN`](#code-smell-detector-plugins-install-plugin)
* [`code-smell-detector plugins link PATH`](#code-smell-detector-plugins-link-path)
* [`code-smell-detector plugins remove [PLUGIN]`](#code-smell-detector-plugins-remove-plugin)
* [`code-smell-detector plugins reset`](#code-smell-detector-plugins-reset)
* [`code-smell-detector plugins uninstall [PLUGIN]`](#code-smell-detector-plugins-uninstall-plugin)
* [`code-smell-detector plugins unlink [PLUGIN]`](#code-smell-detector-plugins-unlink-plugin)
* [`code-smell-detector plugins update`](#code-smell-detector-plugins-update)

## `code-smell-detector hello PERSON`

Say hello

```
USAGE
  $ code-smell-detector hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ code-smell-detector hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/packages/github-pr-code-smell-detector/blob/v0.0.0/src/commands/hello/index.ts)_

## `code-smell-detector hello world`

Say hello world

```
USAGE
  $ code-smell-detector hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ code-smell-detector hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/packages/github-pr-code-smell-detector/blob/v0.0.0/src/commands/hello/world.ts)_

## `code-smell-detector help [COMMAND]`

Display help for code-smell-detector.

```
USAGE
  $ code-smell-detector help [COMMAND...] [-n]

ARGUMENTS
  [COMMAND...]  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for code-smell-detector.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/6.2.50/src/commands/help.ts)_

## `code-smell-detector plugins`

List installed plugins.

```
USAGE
  $ code-smell-detector plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ code-smell-detector plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/index.ts)_

## `code-smell-detector plugins add PLUGIN`

Installs a plugin into code-smell-detector.

```
USAGE
  $ code-smell-detector plugins add PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into code-smell-detector.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CODE_SMELL_DETECTOR_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CODE_SMELL_DETECTOR_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ code-smell-detector plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ code-smell-detector plugins add myplugin

  Install a plugin from a github url.

    $ code-smell-detector plugins add https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ code-smell-detector plugins add someuser/someplugin
```

## `code-smell-detector plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ code-smell-detector plugins inspect PLUGIN...

ARGUMENTS
  PLUGIN...  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ code-smell-detector plugins inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/inspect.ts)_

## `code-smell-detector plugins install PLUGIN`

Installs a plugin into code-smell-detector.

```
USAGE
  $ code-smell-detector plugins install PLUGIN... [--json] [-f] [-h] [-s | -v]

ARGUMENTS
  PLUGIN...  Plugin to install.

FLAGS
  -f, --force    Force npm to fetch remote resources even if a local copy exists on disk.
  -h, --help     Show CLI help.
  -s, --silent   Silences npm output.
  -v, --verbose  Show verbose npm output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into code-smell-detector.

  Uses npm to install plugins.

  Installation of a user-installed plugin will override a core plugin.

  Use the CODE_SMELL_DETECTOR_NPM_LOG_LEVEL environment variable to set the npm loglevel.
  Use the CODE_SMELL_DETECTOR_NPM_REGISTRY environment variable to set the npm registry.

ALIASES
  $ code-smell-detector plugins add

EXAMPLES
  Install a plugin from npm registry.

    $ code-smell-detector plugins install myplugin

  Install a plugin from a github url.

    $ code-smell-detector plugins install https://github.com/someuser/someplugin

  Install a plugin from a github slug.

    $ code-smell-detector plugins install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/install.ts)_

## `code-smell-detector plugins link PATH`

Links a plugin into the CLI for development.

```
USAGE
  $ code-smell-detector plugins link PATH [-h] [--install] [-v]

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help          Show CLI help.
  -v, --verbose
      --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.

  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ code-smell-detector plugins link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/link.ts)_

## `code-smell-detector plugins remove [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ code-smell-detector plugins remove [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ code-smell-detector plugins unlink
  $ code-smell-detector plugins remove

EXAMPLES
  $ code-smell-detector plugins remove myplugin
```

## `code-smell-detector plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ code-smell-detector plugins reset [--hard] [--reinstall]

FLAGS
  --hard       Delete node_modules and package manager related files in addition to uninstalling plugins.
  --reinstall  Reinstall all plugins after uninstalling.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/reset.ts)_

## `code-smell-detector plugins uninstall [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ code-smell-detector plugins uninstall [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ code-smell-detector plugins unlink
  $ code-smell-detector plugins remove

EXAMPLES
  $ code-smell-detector plugins uninstall myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/uninstall.ts)_

## `code-smell-detector plugins unlink [PLUGIN]`

Removes a plugin from the CLI.

```
USAGE
  $ code-smell-detector plugins unlink [PLUGIN...] [-h] [-v]

ARGUMENTS
  [PLUGIN...]  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ code-smell-detector plugins unlink
  $ code-smell-detector plugins remove

EXAMPLES
  $ code-smell-detector plugins unlink myplugin
```

## `code-smell-detector plugins update`

Update installed plugins.

```
USAGE
  $ code-smell-detector plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/5.4.73/src/commands/plugins/update.ts)_
<!-- commandsstop -->
