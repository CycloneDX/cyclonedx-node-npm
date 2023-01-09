# Integration test: OWASP Juice Shop

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

The package manifest is based on
<https://github.com/juice-shop/juice-shop/tree/v14.1.1>

## remarks

* Some dependencies might be incomplete, they do not have own `"dependencies"` printed.
  In this case another complete print exists in the list.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/juice-shop).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "version": "14.1.1",
  "name": "juice-shop",
  "path": ".../demo/juice-shop/project",
  // the usual properties
  "devDependencies": {},
  "peerDependencies": {},
  "dependencies": {
    // lots of dependencies
    "grunt": {
      "version": "1.5.3",
      "name": "grunt",
      "path": ".../demo/juice-shop/project/node_modules/grunt",
      "dependencies": {
        // lots of dependencies
        "js-yaml": {
          "version": "3.14.1",
          "name": "js-yaml",
          "path": ".../demo/juice-shop/project/node_modules/js-yaml",
          "devDependencies": {},
          "peerDependencies": {},
          // !!! no "dependencies"
        },
        // lots of dependencies
      }
    },
    // lots of dependencies
    "js-yaml": {
      "version": "3.14.1",
      "name": "js-yaml",
      "path": ".../demo/juice-shop/project/node_modules/js-yaml",
      // the usual properties
      "dependencies": {
        "argparse": {
          "version": "1.0.10",
          "name": "argparse",
          // the usual properties
          "dependencies": {
            // lots of dependencies
          }
        },
        "esprima": {
          "version": "4.0.1",
          "name": "esprima",
          // the usual properties
          // !!! no "dependencies"
        }
      }
    },
    // lots of dependencies
  }
}
```
