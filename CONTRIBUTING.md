# Contributing

Pull requests are welcome.
But please read the
[CycloneDX contributing guidelines](https://github.com/CycloneDX/.github/blob/master/CONTRIBUTING.md)
first.

## Setup

To start developing simply run to install dev-dependencies and tools:

```shell
npm ci
```

## Build from source

```shell
npm run build-dev
```

## Testing

Set up the tests once, via:

```shell
npm run setup-tests
```

Run to have a proper test suite pass:

```shell
npm test
```

## Coding Style guide & standard

Apply the coding style via:

```shell
npm run cs-fix
```

## Sign off your commits

Please sign off your commits, to show that you agree to publish your changes under the current terms and licenses of the project
, and to indicate agreement with [Developer Certificate of Origin (DCO)](https://developercertificate.org/).

```shell
git commit --signoff ...
```
