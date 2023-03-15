# How it works

This tool utilizes `npm-ls` on the target project and parses its output.

This way the tool does not depend on libraries that are already part of `npm`.
All logic and analysis is done by `npm` itself, the output is just interpreted and used.

Sometimes `npm-ls` got hiccups - caused by individual broken project installation or bugs with `npm`.
Then, this tool may also read `package.json` files inside the `node_module` directory as an additional information source.

Expected transformations, assumptions and results are [described here](result.md).
