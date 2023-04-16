# Integration test: dev dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install
[dev dependencies](https://docs.npmjs.com/cli/v9/configuring-npm/package-json?v=true#devdependencies)
and see how they behave different from
[runtime dependencies](https://docs.npmjs.com/cli/v9/configuring-npm/package-json?v=true#dependencies)
.

## remarks

* The `dev` or  `devOptional` is `true` for devDependencies.
* The `dev` and `devOptional` is absent for non-devDependencies.
* npm6: `_development` instead of `dev`.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/dev-dependencies).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "name": "demo-dev-dependencies",
  "description": "demo: demo-dev-dependencies -- showcase how workspaces look like",
  "optionalDependencies": {
    // required to force `uuid` to be a "devOptional" combination 
    "uuidv4": "^6.2.13"
  },
  "devDependencies": {
    "@types/node": ">=16",
    "@types/uuid": "^8",
    "uuid": "^8"
  },
  "path": ".../cyclonedx-node-npm/demo/dev-dependencies/project",
  // other properties
  "dependencies": {
    "@types/node": {
      "name": "@types/node",
      "dev": true,
      "path": ".../demo/dev-dependencies/project/node_modules/@types/node",
      // other properties
    },
    "uuid": {
      "name": "uuid",
      "devOptional": true,
      "path": ".../demo/dev-dependencies/project/node_modules/uuid",
      // other properties
    }
  }
}
```
