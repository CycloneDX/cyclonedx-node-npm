# Integration test: local workspaces

Install packages with different integrity information based on shipped lock file.

See [the docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json#package)
for "integrity":
> A _sha512_ or _sha1_ [Standard Subresource Integrity](https://w3c.github.io/webappsec/specs/subresourceintegrity/) string for the artifact that was unpacked in this location.

Actually, according to [SSRI spec](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity),
other algorithms are also possible.

Supported algorithms according to the [SSRI library](https://www.npmjs.com/package/ssri) used by npm:
- `sha1`
- `sha256`
- `sha384`
- `sha512`

## remarks

`base64-js` has a _sha1_   integrity in the shipped lock file.
`buffer`    has a _sha384_ integrity in the shipped lock file.
`ieee754`   has a _sha256_ integrity in the shipped lock file.
any other   have  _sha512_ integrity in the lock file.

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
      "_integrity": "sha384-5h1Ji04NR2cbjiY1Shby16SPB3BEtCSWxVGdwPX+AOeweYK1SAjyLLgbJ4mXAAVU",
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
      "integrity": "sha384-5h1Ji04NR2cbjiY1Shby16SPB3BEtCSWxVGdwPX+AOeweYK1SAjyLLgbJ4mXAAVU",
      // other properties
    }
  }
}
```

## notes

calc the hashes
- online tool: <https://www.srihash.org/>
- shell: `curl '$URL' |  openssl dgst -binary -sha512 | openssl base64 -A`
