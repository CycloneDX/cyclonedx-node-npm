# Integration test: dev dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install
[dev dependencies](https://docs.npmjs.com/cli/v9/configuring-npm/package-json?v=true#devdependencies)
and see how they behave different from
[runtime dependencies](https://docs.npmjs.com/cli/v9/configuring-npm/package-json?v=true#dependencies)
.

## remarks

* The `optional` is `true` for optionalDependencies.
* The `optional` is absent for non-optionalDependencies.
* The `dev` is `true` for devDependencies.
* The `dev` is absent for non-devDependencies.
* The `devOptional` is `true` for devDependencies that are also transitive dependencies from optionalDependencies.
* npm6: `_development` instead of `dev`.
* npm6: `_optional` instead of `optional`.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/dev-dependencies).

Output of `npm ls --json -a -l` look like this:

```json5
{
  "name": "demo-dev-dependencies",
  "description": "demo: demo-dev-dependencies -- showcase how workspaces look like",
  "optionalDependencies": {
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
    "@types/uuid": {
      // ...
    },
    "uuid": {
      "name": "uuid",
      "devOptional": true,
      "path": ".../demo/dev-dependencies/project/node_modules/uuid",
      // other properties
    },
    "uuidv4": {
      "name": "uuidv4",
      "optional": true,
      "path": ".../demo/dev-dependencies/project/node_modules/uuidv4",
      // other properties
      "dependencies": {
        "uuid": {
          "name": "uuid",
          "devOptional": true,
          "path": ".../demo/dev-dependencies/project/node_modules/uuid",
          // other properties
        },
        // ...
      }
    }
  }
}
```
