# Integration test: alternative package registry

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install dependencies from alternative package repositories and see how they behave.

This setup has `@act/act` installed from alternative package registry <https:/jsr.io>.

## remarks

* In *npm6* the `_resolved` property is set to the appropriate value in a dependency.
* In *npm7* the  `resolved` property is set to the appropriate value in a dependency.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/alternative-package-registry).

Output of `npm ls --json -a -l` look like this:

```json5
{
  // ... 
  "dependencies": {
    "@act/act": {
      "name": "@jsr/act__act",
      "version": "0.1.3",
      "resolved": "https://npm.jsr.io/~/11/@jsr/act__act/0.1.3.tgz",
      // ...
    }
  }
}
```
