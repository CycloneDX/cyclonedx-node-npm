# CycloneDX SBOM for _npm_

[![shield_npm-version]][link_npm]
[![shield_gh-workflow-test]][link_gh-workflow-test]
[![shield_coverage]][link_codacy]
[![shield_ossf-best-practices]][link_ossf-best-practices]
[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

Create [CycloneDX] Software Bill of Materials (SBOM) from _[npm]_ projects.  
This is probably the most accurate, complete SBOM generator for npm-based projects.

Based on [OWASP Software Component Verification Standard for Software Bill of Materials](https://scvs.owasp.org/scvs/v2-software-bill-of-materials/)'s
criteria, this tool is capable of producing SBOM documents almost passing Level-2 (only signing needs to be done externally).

The resulting SBOM documents follow [official specifications and standards](https://github.com/CycloneDX/specification), 
and might have properties following [`cdx:npm` Namespace Taxonomy](https://github.com/CycloneDX/cyclonedx-property-taxonomy/blob/main/cdx/npm.md)
.

## Requirements

* `node >= 20.18.0`
* `npm >= 9`

However, there are older versions of this tool that support
* Node.js v14 or later
* NPM v6 or later

## Installation

There are multiple methods for installing this tool:

* As a global tool ala `npm`:

  ```shell
  npm install --global @cyclonedx/cyclonedx-npm
  ```

* As a global tool ala `npx`:

  ```shell
  npx --package @cyclonedx/cyclonedx-npm --call exit
  ```

* As a development dependency of the current project:

  ```shell
  npm install --save-dev @cyclonedx/cyclonedx-npm
  ```

## Usage

Depending on the installation method, the following describes the proper usage:

* If installed as a global tool ala `npm`:

  ```shell
  cyclonedx-npm --help
  ```

* If installed as a global tool ala `npx`:  
  — or —  
  If installed as a development dependency of the current projects:

  ```shell
  npx @cyclonedx/cyclonedx-npm --help
  ```

The help page:

```text
Usage: cyclonedx-npm [options] [--] [<package-manifest>]

Create CycloneDX Software Bill of Materials (SBOM) from Node.js NPM projects.

Arguments:
  <package-manifest>              Path to project's manifest file.
                                  (default: "package.json" file in current working directory)

Options:
  --ignore-npm-errors             Whether to ignore errors of NPM.
                                  This might be used, if "npm install" was run with "--force" or "--legacy-peer-deps".
                                  (default: false)
  --package-lock-only             Whether to only use the lock file, ignoring "node_modules".
                                  This means the output will be based only on the few details in and the tree described by the "npm-shrinkwrap.json" or "package-lock.json", rather than the contents of "node_modules" directory.
                                  (default: false)
  --omit <type...>                Dependency types to omit from the installation tree.
                                  (can be set multiple times)
                                  (choices: "dev", "optional", "peer", default: "dev" if the NODE_ENV environment variable is set to "production", otherwise empty)
  -w, --workspace <workspace...>  Only include dependencies for specific workspaces.
                                  (can be set multiple times)
                                  This feature is experimental.
                                  (default: empty)
  --no-workspaces                 Do not include dependencies for workspaces.
                                  Default behaviour is to include dependencies for all configured workspaces.
                                  This cannot be used if workspaces have been explicitly defined using `--workspace`.
                                  This feature is experimental.
  --include-workspace-root        Include workspace root dependencies along with explicitly defined workspaces' dependencies. This can only be used if you have explicitly defined workspaces using `--workspace`.
                                  Default behaviour is to not include the workspace root when workspaces are explicitly defined using `--workspace`.
                                  This feature is experimental.
  --no-include-workspace-root     Do not include workspace root dependencies. This only has an effect if you have one or more workspaces configured in your project.
                                  This is useful if you want to include all dependencies for all workspaces without explicitly defining them with `--workspace` (default behaviour) but you do not want the workspace root dependencies included.
                                  This feature is experimental.
  --gather-license-texts          Search for license files in components and include them as license evidence.
                                  This feature is experimental.
                                  (default: false)
  --flatten-components            Whether to flatten the components.
                                  This means the actual nesting of node packages is not represented in the SBOM result.
                                  (default: false)
  --short-PURLs                   Omit all qualifiers from PackageURLs.
                                  This causes information loss in trade-off shorter PURLs, which might improve ingesting these strings.
                                  (default: false)
  --sv, --spec-version <version>  Which version of CycloneDX spec to use.
                                  (choices: "1.2", "1.3", "1.4", "1.5", "1.6", default: "1.6")
  --output-reproducible           Whether to go the extra mile and make the output reproducible.
                                  This requires more resources, and might result in loss of time- and random-based-values.
                                  (env: BOM_REPRODUCIBLE)
  --of, --output-format <format>  Which output format to use.
                                  (choices: "JSON", "XML", default: "JSON")
  -o, --output-file <file>        Path to the output file.
                                  Set to "-" to write to STDOUT.
                                  (default: write to STDOUT)
  --validate                      Validate resulting BOM before outputting.
                                  Validation is skipped, if requirements not met. See the README.
  --no-validate                   Disable validation of resulting BOM.
  --mc-type <type>                Type of the main component.
                                  (choices: "application", "firmware", "library", default: "application")
  -v, --verbose                   Increase the verbosity of messages.
                                  Use multiple times to increase the verbosity even more.
  -V, --version                   output the version number
  -h, --help                      display help for command
```

## Demo

For a demo of _cyclonedx-npm_ see the [demo projects][demo_readme].

## How it works

This tool utilizes _[npm]_ to collect evidences of installed packages/modules.
Read more in the [dedicated docs](https://github.com/CycloneDX/cyclonedx-node-npm/tree/main/docs/how.md).

The appropriate _npm_ executable is detected automatically, yet can be overridden with the environment variable `npm_execpath`.  
Autodetect: If called from `npm`/`npx` context, then the current _npm_ executable is utilized, otherwise it is managed by SHELL and PATH.

This tool does not do artificial deduplication.
Therefore, if a component is installed multiple times, it appears multiple times in the SBOM result.
Read more on the topic in the [dedicated docs "Component Deduplication"](https://github.com/CycloneDX/cyclonedx-node-npm/tree/main/docs/component_deduplication.md).

## Internals

This tool utilizes the [CycloneDX library][cyclonedx-library] to generate the actual data structures, and serialize and validate them.  
Validation requires [transitive optional dependencies](https://github.com/CycloneDX/cyclonedx-javascript-library/blob/main/README.md#optional-dependencies).

This tool does **not** expose any additional _public_ API or classes - all code is intended to be internal and might change without any notice during version upgrades.
However, the CLI is stable - you may call it programmatically like:
```javascript
const { execFileSync } = require('child_process')
const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('buffer')
const sbom = JSON.parse(execFileSync(process.execPath, [
    '../path/to/this/package/bin/cyclonedx-npm-cli.js',
    '--output-format', 'JSON',
    '--output-file', '-'
    // additional CLI args
], { stdio: ['ignore', 'pipe', 'ignore'], encoding: 'buffer', maxBuffer: BUFFER_MAX_LENGTH }))
```
## Contributing

Feel free to open issues, bugreports or pull requests.  
See the [CONTRIBUTING][contributing_file] file for details.

## License

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.  
See the [LICENSE][license_file] file for the full license.

[license_file]: https://github.com/CycloneDX/cyclonedx-node-npm/blob/main/LICENSE
[contributing_file]: https://github.com/CycloneDX/cyclonedx-node-npm/blob/main/CONTRIBUTING.md
[demo_readme]: https://github.com/CycloneDX/cyclonedx-node-npm/blob/main/demo/README.md

[CycloneDX]: https://cyclonedx.org/
[npm]: http://www.npmjs.com/
[cyclonedx-library]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-library

[shield_gh-workflow-test]: https://img.shields.io/github/actions/workflow/status/CycloneDX/cyclonedx-node-npm/nodejs.yml?branch=main&logo=GitHub&logoColor=white "tests"
[shield_ossf-best-practices]: https://img.shields.io/cii/level/6614?label=OpenSSF%20best%20practices "OpenSSF best practices"
[shield_coverage]: https://img.shields.io/codacy/coverage/16b034e5463543008e1cc0e2a3ed7005?logo=Codacy&logoColor=white "test coverage"
[shield_npm-version]: https://img.shields.io/npm/v/%40cyclonedx%2fcyclonedx-npm/latest?label=npm&logo=npm&logoColor=white "npm"
[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-node-npm?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_gh-workflow-test]: https://github.com/CycloneDX/cyclonedx-node-npm/actions/workflows/nodejs.yml?query=branch%3Amain
[link_codacy]: https://app.codacy.com/gh/CycloneDX/cyclonedx-node-npm/dashboard
[link_ossf-best-practices]: https://www.bestpractices.dev/projects/6614
[link_npm]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-npm
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
