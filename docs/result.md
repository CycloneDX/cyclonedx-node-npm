# Result

This document will describe, how certain SBOM results should be deducted.

## Basics

A package might have a name, a version, and dependencies.  
This information is usually stored in a `package.json` file.

## Project -> `bom.metadata.component`

TBD

## Package -> `...component`

TBD

## Bundled dependencies -> `...component.components`

Some projects might have [`bundleDependencies`](https://docs.npmjs.com/cli/v8/configuring-npm/package-json#bundledependencies),
which means, that dependencies are part of a package
and the dependencies of each of these bundled dependencies are part of that package, too.  
This results in a bundle where the project itself and all the `bundleDependencies` are shipped as one blob.

When rendering a CycloneDX document:

* `bundleDependencies` should be rendered as subcomponents of a `component`.
* `bundleDependencies` should be treated as regular `dependencies`.

Example:

```json
{
  "$schema": "http://cyclonedx.org/schema/bom-1.4.schema.json",
  "bomFormat": "CycloneDX",
  "specVersion": "1.4",
  "version": 1,
  "metadata": {
    "component": {
      "bom-ref": "acme/my-project",
      "type": "application",
      "group": "acme",
      "name": "my-project",
      "purl": "pkg:npm/acme/my-project",
      "components": [
        {
          "bom-ref": "acme/my-project#acme/my-bundled-package",
          "type": "library",
          "group": "acme",
          "name": "my-bundled-package",
          "version": "1",
          "purl": "pkg:npm/acme/my-bundled-package@1"
        },
        {
          "bom-ref": "acme/my-project#foo/package-A",
          "type": "library",
          "group": "foo",
          "name": "package-A",
          "version": "1",
          "purl": "pkg:npm/foo/package-A@1"
        }
      ]
    }
  },
  "components": [
    {
      "bom-ref": "bar/package-with-bundled-deps",
      "type": "library",
      "group": "bar",
      "name": "package-with-bundled-deps",
      "version": "1",
      "purl": "pkg:npm/bar/package-with-bundled-deps@1",
      "components": [
        {
          "bom-ref": "bar/package-with-bundled-deps#baz/package-B",
          "type": "library",
          "group": "baz",
          "name": "package-B",
          "version": "1",
          "purl": "pkg:npm/baz/package-B@1"
        },
        {
          "bom-ref": "bar/package-with-bundled-deps#bundled-internal-package",
          "type": "library",
          "name": "bundled-internal-package",
          "purl": "pkg:npm/bundled-internal-package"
        }
      ]
    },
    {
      "bom-ref": "foo/package-A",
      "type": "library",
      "group": "foo",
      "name": "package-A",
      "version": "3",
      "purl": "pkg:npm/foo/package-A@3"
    }
  ],
  "dependencies": [
    {
      "ref": "my-project",
      "dependsOn": [
        "acme/my-project#acme/my-bundled-package",
        "acme/my-project#foo/package-A",
        "bar/package-with-bundled-deps"
      ]
    },
    {
      "ref": "acme/my-project#acme/my-bundled-package",
      "dependsOn": ["acme/my-project#foo/package-A"]
    },
    {
      "ref": "acme/my-project#foo/package-A"
    },
    {
      "ref": "bar/package-with-bundled-deps",
      "dependsOn": [
        "bar/package-with-bundled-deps#bundled-internal-package",
        "foo/package-A"
      ]
    },
    {
      "ref": "bar/package-with-bundled-deps#bundled-internal-package",
      "dependsOn": [
        "bar/package-with-bundled-deps#baz/package-B"
      ]
    },
    {
      "ref": "bar/package-with-bundled-deps#baz/package-B"
    },
    {
      "ref": "foo/package-A"
    }
  ]
}
```
