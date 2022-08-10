# cyclonedx-node-npm

Create [CycloneDX] Software Bill of Materials (SBOM) from  _[npm]_ projects.

## 🚧 🏗️ this project is an early development stage

See the projects issues, pull request's and milestone for the progress.

Development will happen in branch `1.0-dev`.

Feel free to contribute, write issues, create pull requests, or start discussions.  
Please read the [CONTRIBUTING](CONTRIBUTING.md) file first.

[CycloneDX]: https://cyclonedx.org/
[npm]: http://www.npmjs.com//


---- 

## Requirements

* `node` >= `16.0.0`
* `npm` in range `6 - 8`

## Install

tbd 

## Usage

```text
$npx cyclonedx-npm --help
Usage: cyclonedx-node-npm [options] [--] [<package-manifest>]

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

## contributing

TBD

## License 

TBD 
