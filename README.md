[![shield_npm-version]][link_npm]
[![shield_gh-workflow-test]][link_gh-workflow-test]
[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

# cyclonedx-npm

Create [CycloneDX] Software Bill of Materials (SBOM) from _[npm]_ projects.

The resulting SBOM documents follow [official specifications and standards](https://github.com/CycloneDX/specification), 
and might have properties following [`cdx:npm` Namespace Taxonomy](https://github.com/CycloneDX/cyclonedx-property-taxonomy/blob/main/cdx/npm.md)
.

## Requirements

* `node` >= `14`
* `npm` in range `6 - 9`

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

* As a development dependency of the current projects:

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
  <package-manifest>        Path to project's manifest file.
                            (default: "package.json" file in current working directory)

Options:
  --ignore-npm-errors       Whether to ignore errors of NPM.
                            This might be used, if "npm install" was run with "--force" or "--legacy-peer-deps".
                            (default: false)
  --package-lock-only       Whether to only use the lock file, ignoring "node_modules".
                            This means the output will be based only on the few details in and the tree described by the "npm-shrinkwrap.json" or "package-lock.json", rather than the contents of "node_modules" directory.
                            (default: false)
  --omit <type...>          Dependency types to omit from the installation tree.
                            (can be set multiple times)
                            (choices: "dev", "optional", "peer", default: "dev" if the NODE_ENV environment variable is set to "production", otherwise empty)
  --flatten-components      Whether to flatten the components.
                            This means the actual nesting of node packages is not represented in the SBOM result.
                            (default: false)
  --short-PURLs             Omit all qualifiers from PackageURLs.
                            This causes information loss in trade of shorter PURLs, which might improve digesting these strings.
                            (default: false)
  --spec-version <version>  Which version of CycloneDX spec to use.
                            (choices: "1.2", "1.3", "1.4", default: "1.4")
  --output-reproducible     Whether to go the extra mile and make the output reproducible.
                            This requires more resources, and might result in loss of time- and random-based-values.
                            (env: BOM_REPRODUCIBLE)
  --output-format <format>  Which output format to use.
                            (choices: "JSON", "XML", default: "JSON")
  --output-file <file>      Path to the output file.
                            Set to "-" to write to STDOUT.
                            (default: write to STDOUT)
  --validate                Validate resulting BOM before outputting. Validation is skipped, if requirements not met.
                            (default: true)
  --no-validate             Disable validation of resulting BOM.
  --mc-type <type>          Type of the main component.
                            (choices: "application", "firmware", "library", default: "application")
  -V, --version             output the version number
  -h, --help                display help for command
```

## Demo

For a demo of _cyclonedx-npm_ see the [demo project][demo_readme].

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
[shield_npm-version]: https://img.shields.io/npm/v/@cyclonedx/cyclonedx-npm?logo=npm&logoColor=white "npm"
[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-node-npm?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_gh-workflow-test]: https://github.com/CycloneDX/cyclonedx-node-npm/actions/workflows/nodejs.yml?query=branch%3Amain
[link_npm]: https://www.npmjs.com/package/@cyclonedx/cyclonedx-npm
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
