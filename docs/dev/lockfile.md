# The lockfile situation

This project is a CLI tool.
Therefore, it might be appealing to maintain a `npm-srinkwrap.json` and have it shipped,
instead of maintaining a [`package-lock.json`](../../package-lock.json) that is not shipped.

Unfortunately, `npm` would install everything that is part of a shrinkwrap file,
when installing via `npm i -S ...` instead of `npm i -g ...`.
This would lead to a bunch of optional dependencies or even development dependencies installed downstream,
which is not intended and would bloat the setup.

So, lets maintain a lockfile, instead of a shrinkwrap file.
