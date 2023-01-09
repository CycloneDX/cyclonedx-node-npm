# Integration test: local dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install local packages/dependencies and see how they behave.

## remarks

* The `resolved` is relative to each `path`.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/local-dependencies).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "name": "demo-local-deps",
  "path": "...",
  // other properties
  "dependencies": {
    "my-local-a": {
      "resolved": "file:../packages/my-local-a",
      "name": "my-local-a",
      "path": ".../node_modules/my-local-a",
      // other properties
      "dependencies": {
        "my-local-b-off": {
          "resolved": "file:../packages/my-local-b",
          "name": "my-local-b",
          "path": ".../node_modules/my-local-b-off",
          // other properties
        }
      }
    },
    "my-noname": {
      "resolved": "file:../packages/my-noname",
      "name": "my-noname",
      "path": ".../node_modules/my-noname",
      // other properties
    }
  }
}
```
