# How it works

This tool utilizes `npm-ls` on the target project and parses its output.

This way the tool does not depend on libraries that are already part of `npm`.
All logic and analysis is done by `npm` itself, the output is just interpreted and used.

Sometimes `npm-ls` got hiccups - caused by individual broken project installation or bugs with `npm`.
Then, this tool may also read `package.json` files inside the `node_module` directory as an additional information source.

Expected transformations, assumptions and results are [described here](result.md).

## Omitting dependencies

When `--omit` (`dev`, `optional`, `peer`) is configured, relying on `npm-ls --omit=...` alone is not sufficient:
`npm-ls` only filters direct edges on root and workspace packages, and without `--package-lock-only` its JSON output omits `dev`, `optional`, and `devOptional` node flags.

To handle transitive and `devOptional` dependencies consistently, this tool:
1. Indexes all deduplicated packages from the `npm-ls` tree while classifying dependency edges using each package's manifest metadata (`devDependencies` on root and workspaces, `optionalDependencies`, `_dependencies`, `peerDependencies`, and `peerDependenciesMeta`).
2. Excludes edges whose dependency type is omitted, except `extraneous` entries.
3. Walks reachable packages starting from the root package, skipping nodes flagged as `dev`, `optional`, `peer`, or `devOptional` (when both `dev` and `optional` are omitted) for the configured `--omit` types.

