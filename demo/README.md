# Demo

Purpose is to demonstrate how _cyclonedx-npm_ integrates, can be used, and how the generated output will look like.
Each project demonstrates an individual use case:

* [use of `bundledDependencies`](bundled-dependencies)
* [use of `devDependencies`](dev-dependencies)
* [use of local dependencies](local-dependencies)
* [use of workspaces](local-workspaces)
* [the Juice Shop](juice-shop)
* [package-integrity](package-integrity)
* [package with buildID in version](package-with-build-id)

Each dir contains of a `project` folder that holds the npm package
and a `example-results` folder that holds generated boms.
Bom generation is done by [`gen-boms.sh`](gen-boms.sh)
