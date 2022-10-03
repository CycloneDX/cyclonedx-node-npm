# Integration test: local workspaces

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install local workspaces and see how they behave.

## remarks

* The `dev` is `true` for devDependencies.
* The `dev` is absent for non-devDependencies.
* npm6: `_development` instead of `dev`.

## output


(i) see [demo snapshots](../../tests/_data/npm-ls_demo-results/dev-dependencies).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "name": "demo-dev-dependencies",
  "description": "demo: demo-dev-dependencies -- showcase how workspaces look like",
  "devDependencies": {
    "@types/node": ">=16"
  },
  "path": "/home/flow/Documents/Coding/node/cyclonedx-node-npm/demo/dev-dependencies/project",
  // other properties
  "dependencies": {
    "@types/node": {
      "name": "@types/node",
      "dev": true,
      "path": "/home/flow/Documents/Coding/node/cyclonedx-node-npm/demo/dev-dependencies/project/node_modules/@types/node",
      // other properties
    }
  }
}
```
