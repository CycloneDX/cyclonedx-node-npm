# Integration test: bundled dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install [bundled packages](https://docs.npmjs.com/cli/v6/configuring-npm/package-json#bundleddependencies)
and see how they behave.  
They can be caused via deprecated `bundleDependencies` or new `bundledDependencies`.
Values can be `true` to mark all dependencies as bundled,
or a list of `string` that identifies the keys in dependencies-lists.

The package [`bundle-dependencies`](https://www.npmjs.com/package/bundle-dependencies)
ships with bundled version of `yargs`.

## remarks

* In *npm6* the `_inBundle` property is set to `true` in a dependency
* In *npm8* the  `inBundle` property is set to `true` in a dependency.
* Additionally, there is the property `bundleDependencies`(deprecated)/`bundledDependencies` in a component.  
  Value might be `true`(all), `false`(none), or a list of `string` that point to the keys in dependency list.  
* Only one `resolved` can be found, since al the other packages were bundled, and are therefore not resolve.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/bundled-dependencies).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "name": "demo-bundled-deps",
  "path": "...",
  // other properties
  "dependencies": {
    "bundle-dependencies": {
      "resolved": "https://registry.npmjs.org/bundle-dependencies/-/bundle-dependencies-1.0.2.tgz",
      "name": "bundle-dependencies",
      "bundleDependencies": [
        "yargs"
      ],
      // other properties
      "path": ".../node_modules/bundle-dependencies",
      "dependencies": {
        "yargs": {
          "name": "yargs",
          "inBundle": true,
          // other properties
          "path": ".../node_modules/bundle-dependencies/node_modules/yargs",
          "dependencies": {
            "camelcase": {
              "name": "camelcase",
              "inBundle": true,
              "path": ".../node_modules/bundle-dependencies/node_modules/camelcase",
              // other properties
            },
            // other dependencies
          }
        }
      }
    }
  }
}
```
