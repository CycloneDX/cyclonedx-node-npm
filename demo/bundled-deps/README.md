# Integration test: bundled dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install [bundled packages](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#bundleddependencies)
and see how they behave.  
They can be caused via deprivation `bundleDependencies` or new `bundledDependencies`.
Values can be `true` to mark all dependencies as bundled, 
or a list of `string` that identifies the keys in dependencies-lists.

The package [`bundle-dependencies`](https://www.npmjs.com/package/bundle-dependencies)
ships with bundled version of `yargs`.

## remarks

* in _npm6_ the `_inBundle` property is set to `true` in a dependency
* in _npm8_ the  `inBundle` property is set to `true` in a dependency.
* additionally there is the property `bundleDependencies`/`bundledDependencies` in a component.

## output

Output of `npm ls --json -a -l` look like this: 

```text
{
  "name": "demo-bundled-deps",
  "path": ".../demo/bundled-deps/project/node_modules/bundle-dependencies/node_modules/yargs",
  // other properties
  "dependencies": {
    "bundle-dependencies": {
      "version": "1.0.2",
      "name": "bundle-dependencies",
      // other properties
      "bundleDependencies": [
        "yargs"
      ],
      "dependencies": {
        "yargs": {
          "version": "4.1.0",
          "name": "yargs",
          "inBundle": true,
          "extraneous": false,
          "path": ".../demo/bundled-deps/project/node_modules/bundle-dependencies/node_modules/yargs",
          "dependencies": {
            "camelcase": {
              "version": "2.1.0",
              "name": "camelcase",
              "inBundle": true,
              "path": "/home/flow/Documents/Coding/node/cyclonedx-node-npm/demo/bundled-deps/project/node_modules/bundle-dependencies/node_modules/camelcase",
              // other properties
            },
            // more dependencies
          }
        }
      }
    }
  }
}
```

