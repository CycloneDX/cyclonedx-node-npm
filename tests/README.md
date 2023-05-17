# Tests

Tests are written in plain JavaScript, and
they are intended to test the build result(`dist/`),
instead of the source(`src/`).

## Writing tests

Test files must follow the pattern `**.{spec,test}.[cm]?js`,
to be picked up.

## Snapshots

Some tests check against snapshots.  
To update these, set the env var `CNPM_TEST_UPDATE_SNAPSHOTS` to a non-falsy value.

## Run node tests

Test runner is `jest`,
configured in [jest config file](../jest.config.js).

```shell
npm run test:jest
```
