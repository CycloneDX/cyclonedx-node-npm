# Integration test: local workspaces

Install packages with different integrity information based on shipped lock file.


## remarks

`base64-js` has a _sha1_ integrity in the lock file.
others have sha512 integrity in the lock file.

See the [the docs](https://docs.npmjs.com/cli/v9/configuring-npm/package-lock-json#package)
for "ingetrity":
> A sha512 or sha1 [Standard Subresource Integrity](https://w3c.github.io/webappsec/specs/subresourceintegrity/) string for the artifact that was unpacked in this location.

## output

see [demo snapshots](../../tests/_data/npm-ls_demo-results/package-integrity).

Output of `npm ls --json -a -l` look like this:

```json5
{
  // TBD
}
```

