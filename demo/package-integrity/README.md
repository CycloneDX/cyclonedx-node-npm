# Integration test: local workspaces

Install packages with different integrity information based on shipped lock file.

See [the docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json#package)
for "integrity":
> A _sha512_ or _sha1_ [Standard Subresource Integrity](https://w3c.github.io/webappsec/specs/subresourceintegrity/) string for the artifact that was unpacked in this location.

## remarks

`base64-js` has a _sha1_ integrity in the shipped lock file.
others have _sha512_ integrity in the lock file.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/package-integrity).

Output of `npm6 ls --json -a -l` look like this:

```json5
{
  "name": "demo-package-integrity",
  "description": "demo: package-integrity -- packages with different integrity information.",
  "private": true,
  "dependencies": {
    "base64-js": {
      "name": "base64-js",
      "_integrity": "sha1-aSbRsZT7xze47tUTdW3i/Np+pAg=",
      // other properties
    },
    "buffer": {
      "name": "buffer",
      "_integrity": "sha512-zvj65TkFeIt3i6aj5bIvJDzjjQQGs4o/sNoezg1F1kYap9Nu2jcUdpwzRSJTHMMzG0H7bZkn4rNQpImhuxWX2A==",
      // other properties
    }
  }
}
```

Output of `npm7 ls --json -a -l` look like this:

```json5
{
  "name": "demo-package-integrity",
  "description": "demo: package-integrity -- packages with different integrity information.",
  "private": true,
  "dependencies": {
    "base64-js": {
      "name": "base64-js",
      "integrity": "sha1-aSbRsZT7xze47tUTdW3i/Np+pAg=",
      // other properties
    },
    "buffer": {
      "name": "buffer",
      "integrity": "sha512-zvj65TkFeIt3i6aj5bIvJDzjjQQGs4o/sNoezg1F1kYap9Nu2jcUdpwzRSJTHMMzG0H7bZkn4rNQpImhuxWX2A==",
      // other properties
    }
  }
}
```
