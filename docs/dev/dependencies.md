# dev: exports

This project is intended to be used as a globally installed standalone CLI tool,
so it needs to pin its dependencies.

Therefore, the project ships a [`npm-shrinkwrap.json`](../../npm-shrinkwrap.json) that pins dependencies on install client-side.  
This also means, that a new maintenance release must be built, when dependency changes are intended to be reflected by client-side.
