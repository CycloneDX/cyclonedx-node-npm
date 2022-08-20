[![shield_gh-workflow-test]][link_gh-workflow-test]
[![shield_npm-version]][link_npm]
[![shield_license]][license_file]  
[![shield_website]][link_website]
[![shield_slack]][link_slack]
[![shield_groups]][link_discussion]
[![shield_twitter-follow]][link_twitter]

----

# cyclonedx-npm

Create [CycloneDX] Software Bill of Materials (SBOM) from  _[npm]_ projects.

## 🚧 🏗️ this project is in late development stage - BETA STATUS

All features are implemented. Most of them are tested and working as expected.  
Implementations are not ideal, internal refactoring and rework will be done to improve performance and maintainability.

See the projects [issues](https://github.com/CycloneDX/cyclonedx-node-npm/issues),
[pull requests](https://github.com/CycloneDX/cyclonedx-node-npm/pulls) and 
[milestones](https://github.com/CycloneDX/cyclonedx-node-npm/milestones) for the progress.

Development will happen in branch [`1.0-dev`](https://github.com/CycloneDX/cyclonedx-node-npm/tree/1.0-dev).

## Requirements

* `node` >= `16.0.0`
* `npm` in range `6 - 8`

## Install

As a global tool:

```shell
npm install --global @cyclonedx/cyclonedx-npm
```

As a development dependency of the current package:

```shell
npm i -D @cyclonedx/cyclonedx-npm
```

## Usage

```text
$ cyclonedx-npm --help
Usage: cyclonedx-npm [options] [--] [<package-manifest>]

Create CycloneDX Software Bill of Materials (SBOM) from Node.js NPM projects.

Arguments:
  <package-manifest>        Path to project's manifest file. 
                            (default: "package.json" file in current working directory.)

Options:
  --package-lock-only       Whether to only use the lock file, ignoring "node_modules".
                            This means the output will be based only on the few details in and the tree described by the "npm-shrinkwrap.json" or "package-lock.json", rather than the contents of "node_modules" directory.
                            (default: false)
  --omit <type...>          Dependency types to omit from the installation tree.
                            (can be set multiple times)
                            (choices: "dev", "optional", "peer", default: "dev" if the NODE_ENV environment variable is set to "production", otherwise empty.)
  --flatten-components      Whether to flatten the components.
                            This means the original nesting of components is not represented in the output.
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
  --mc-type <type>          Type of the main component.
                            (choices: "application", "firmware", "library", default: "application")
  -V, --version             output the version number
  -h, --help                display help for command
```

## Demo

For a demo of _cyclonedx-npm_ see the [demo project][demo_readme].

## Internals

This tool utilizes the [CycloneDX library][cyclonedx-library] to generate the actual data structures.

This tool does **not** expose any additional _public_ api or classes - all code is intended to be internal and might change without any notice during version upgrades.

## Contributing

Feel free to open issues, bugreports or pull requests.  
See the [CONTRIBUTING][contributing_file] file for details.

## License

Permission to modify and redistribute is granted under the terms of the Apache 2.0 license.  
See the [LICENSE][license_file] file for the full license.

[license_file]: https://github.com/CycloneDX/cyclonedx-node-npm/blob/1.0-dev/LICENSE
[contributing_file]: https://github.com/CycloneDX/cyclonedx-node-npm/blob/1.0-dev/CONTRIBUTING.md
[demo_readme]: https://github.com/CycloneDX/cyclonedx-node-npm/blob/1.0-dev/demo/README.md

[CycloneDX]: https://cyclonedx.org/
[npm]: http://www.npmjs.com//
[cyclonedx-library]: https://www.npmjs.com/package/%40cyclonedx/cyclonedx-library

[shield_gh-workflow-test]: https://img.shields.io/github/workflow/status/CycloneDX/cyclonedx-node-npm/Node%20CI/1.0-dev?logo=GitHub&logoColor=white "tests"
[shield_npm-version]: https://img.shields.io/npm/v/%40cyclonedx/cyclonedx-npm?logo=npm&logoColor=white "npm"
[shield_license]: https://img.shields.io/github/license/CycloneDX/cyclonedx-node-npm?logo=open%20source%20initiative&logoColor=white "license"
[shield_website]: https://img.shields.io/badge/https://-cyclonedx.org-blue.svg "homepage"
[shield_slack]: https://img.shields.io/badge/slack-join-blue?logo=Slack&logoColor=white "slack join"
[shield_groups]: https://img.shields.io/badge/discussion-groups.io-blue.svg "groups discussion"
[shield_twitter-follow]: https://img.shields.io/badge/Twitter-follow-blue?logo=Twitter&logoColor=white "twitter follow"

[link_website]: https://cyclonedx.org/
[link_gh-workflow-test]: https://github.com/CycloneDX/cyclonedx-node-npm/actions/workflows/nodejs.yml?query=branch%3A1.0-dev
[link_npm]: https://www.npmjs.com/package/%40cyclonedx/cyclonedx-npm
[link_slack]: https://cyclonedx.org/slack/invite
[link_discussion]: https://groups.io/g/CycloneDX
[link_twitter]: https://twitter.com/CycloneDX_Spec
