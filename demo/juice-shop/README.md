# Integration test: OWASP Juice Shop

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

The output is _reproducible_, due to the [shipped npm-locked](project/package-lock.json) versions.  

The package manifest is based on
https://github.com/juice-shop/juice-shop/tree/v14.1.1

## Reproducible results

* [`results/bom.1.2.xml`](results/bom.1.2.xml)
* [`results/bom.1.3.xml`](results/bom.1.3.xml)
* [`results/bom.1.4.xml`](results/bom.1.4.xml)
* [`results/bom.1.2.json`](results/bom.1.2.json)
* [`results/bom.1.3.json`](results/bom.1.3.json)
* [`results/bom.1.4.json`](results/bom.1.4.json)

## Setup

For the sake of a demo, a relative path to the _cyclonedx-node-npm_ project is used,
so the current code is symlinked and taken into action.

To get the setup up and running, run from the demo directory:

```shell
npm --prefix project ci
```

## Usage examples

Run one of these from the demo directory:

* See _cyclonedx-node-npm_ help page:
  ```shell
  npx --prefix project cyclonedx-node-npm --help
  ```
* Make XML sbom:
  ```shell
  npx --prefix project cyclonedx-node-npm --exclude-dev --spec-version=1.2 --output-format=XML --output-file="$PWD/results/bom.1.2.xml"
  npx --prefix project cyclonedx-node-npm --exclude-dev --spec-version=1.3 --output-format=XML --output-file="$PWD/results/bom.1.3.xml"
  npx --prefix project cyclonedx-node-npm --exclude-dev --spec-version=1.4 --output-format=XML --output-file="$PWD/results/bom.1.4.xml"
  ```
* Make JSON sbom:
  ```shell
  npx --prefix project cyclonedx-node-npm --exclude-dev --spec-version=1.2 --output-format=JSON --output-file="$PWD/results/bom.1.2.xml"
  npx --prefix project cyclonedx-node-npm --exclude-dev --spec-version=1.3 --output-format=JSON --output-file="$PWD/results/bom.1.3.xml"
  npx --prefix project cyclonedx-node-npm --exclude-dev --spec-version=1.4 --output-format=JSON --output-file="$PWD/results/bom.1.4.xml"
  ```
