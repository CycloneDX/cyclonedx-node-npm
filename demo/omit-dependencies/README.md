# Integration test: omitting dependencies

Install a local workspace and local packages covering `devDependencies`, `optionalDependencies`, `peerDependencies`, `peerDependenciesMeta` (`optional: true`), and `devOptional` overlaps to showcase how `--omit` behaves across direct, workspace, and transitive edges.

## remarks

* `ws-app` is a local workspace declaring `prod-lib` (`dependencies`), `ws-dev` (`devDependencies` and `peerDependencies`), and `ws-opt` (`optionalDependencies`).
* `shared-dev-opt` is both a root `devDependency` and a transitive `optionalDependency` of `prod-lib`, so npm flags it as `devOptional`.
* `trans-opt` is strictly a transitive `optionalDependency` of `prod-lib`.
* `trans-peer` is a `peerDependency` of `prod-lib` (and root).
* `trans-peer-opt` is a root `devDependency` and an optional `peerDependency` (`peerDependenciesMeta.optional: true`) of `prod-lib`.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/omit-dependencies).
