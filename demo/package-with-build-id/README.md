# Integration test: local workspaces

Install a package with a non-SemVer or a buildID and see how they behave.

## remarks

* _npm_ v6 cuts of the buildID from the version string
* _npm_ v7 leaves the version string unchanged

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/package-with-build-id).

Output of `npm6 ls --json -a -l` look like this:

```json5
{
  "name": "demo-package-with-build-id",
  "version": "1.0.0-123",
  "_id": "demo-package-with-build-id@1.0.0-123",
  "_shrinkwrap": {
    "name": "demo-package-with-build-id",
    "version": "1.0.0-123+456",
    "lockfileVersion": 1
  },
  // other properties
}
```


Output of `npm7 ls --json -a -l` look like this:

```json5
{
  "version": "1.0.0-123+456",
  "name": "demo-package-with-build-id",
  "_id": "demo-package-with-build-id@1.0.0-123+456",
  // other properties
}
```
