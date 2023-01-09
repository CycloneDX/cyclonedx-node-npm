# Integration test: local workspaces

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install local workspaces and see how they behave.

Workspaces are a feature that is available since NPM7.

## remarks

* The `resolved` is not present in every dependency listing. Only on top-most level.
* The `resolved` is relative to each `path`.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/local-workspaces).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "name": "demo-workspaces",
  // other properties
  "workspaces": [
    "workspaces/*"
  ],
  "path": "...",
  "dependencies": {
    "my-local-a": {
      "resolved": "file:../workspaces/my-local-a",
      "name": "my-local-a",
      "path": ".../node_modules/my-local-a",
      // other properties
      "dependencies": {
        "my-local-b-off": {
          "name": "my-local-b-off",
          "path": ".../node_modules/my-local-b-off",
          // other properties
        }
      }
    },
    "my-local-b-off": {
      "resolved": "file:../workspaces/my-local-b",
      "name": "my-local-b-off",
      "path": ".../node_modules/my-local-b-off",
      // other properties
    },
    "my-local-c": {
      "resolved": "file:../workspaces/my-local",
      "name": "my-local-c",
      "path": ".../node_modules/my-local-c",
      // other properties
      "dependencies": {
        "my-local-a": {
          "name": "my-local-a",
          "path": ".../node_modules/my-local-a",
          // other properties
        },
        "my-local-b-off": {
          "name": "my-local-b-off",
          "path": ".../node_modules/my-local-b-off",
          // other properties
        }
      }
    }
  }
}
```
