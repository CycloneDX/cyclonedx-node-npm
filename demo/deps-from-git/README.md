
# Integration test: dev dependencies

*ATTENTION*: this demo might use known vulnerable dependencies for showcasing purposes.

Install dependencies from `git`-sources, instead of the usual npmjs registry.

## remarks

used all known `git`-related sources:
- "lib0": "git://github.com/CycloneDX/cyclonedx-javascript-library.git#v6.0.0",
- "lib1": "git+https://github.com/CycloneDX/cyclonedx-javascript-library.git#semver:6.1.0",
- "lib2": "git+ssh://github.com/CycloneDX/cyclonedx-javascript-library.git#v6.2.0",
- "lib3": "git@github.com:CycloneDX/cyclonedx-javascript-library.git#v6.3.0",
- "lib4": "github:CycloneDX/cyclonedx-javascript-library.git#v6.4.0",
- "lib5": "CycloneDX/cyclonedx-javascript-library#v6.5.0"

All these sources were transformed to valid URLs by node, and are available as `resolved`.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/dev-dependencies).

Output of `npm ls --json -a -l` look like this:
```json5
{
  "version": "1.0.0",
  "name": "demo-deps-from-git",
  "private": true,
  // ...
  "dependencies": {
    "lib0": {
      "version": "6.0.0",
      "resolved": "git+ssh://git@github.com/CycloneDX/cyclonedx-javascript-library.git#c887c803ac56deb5f91b617ef0486ca3fb98473b",
      "name": "@cyclonedx/cyclonedx-library",
      // ...      
    },
    "lib1": {
      "version": "6.1.0",
      "resolved": "git+ssh://git@github.com/CycloneDX/cyclonedx-javascript-library.git#e1a99f9871ca1cbd9b7f7b097c0e2aa8f1e79fe7",
      "name": "@cyclonedx/cyclonedx-library",
      // ...      
    },
    "lib2": {
      "version": "6.2.0",
      "resolved": "git+ssh://git@github.com/CycloneDX/cyclonedx-javascript-library.git#d66d36280dde484bcf73a5c2139961663e3ba954",
      "name": "@cyclonedx/cyclonedx-library",
      // ...      
    },
    "lib3": {
      "version": "6.3.0",
      "resolved": "git+ssh://git@github.com/CycloneDX/cyclonedx-javascript-library.git#7a914980f0508368df54ca193347cec6ffd16415",
      "name": "@cyclonedx/cyclonedx-library",
       // ...      
    },
    "lib4": {
      "version": "6.4.0",
      "resolved": "git+ssh://git@github.com/CycloneDX/cyclonedx-javascript-library.git#3367c1638662d57c53caff0824ee94cd7859bee2",
      "name": "@cyclonedx/cyclonedx-library",
       // ...
    },
    "lib5": {
      "version": "6.5.0",
      "resolved": "git+ssh://git@github.com/CycloneDX/cyclonedx-javascript-library.git#4cea42bf5ec78f17b86dcd308022b6d52e9a98f0",
      "name": "@cyclonedx/cyclonedx-library",
       // ...
    }
  }
}
```
