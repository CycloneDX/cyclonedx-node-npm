# Changelog

All notable changes to this project will be documented in this file.

## 1.0.0 - unreleased

## 1.0.0-beta.8 - 2022-09-10

* Fixed
  * Run on Windows systems was improved for `npm`/`npx` sub-processes.
* Misc
  * Style: imports are sorted, now.
* Build
  * Use _TypeScript_ `v4.8.3` now, was `v4.8.2`.

## 1.0.0-beta.7 - 2022-09-07

* Changed
  * PackageUrl(PURL) in JSON and XML results are as short as possible, but still precise.

## 1.0.0-beta.6 - 2022-09-06

* Added
  * CLI switch `--ignore-npm-errors` to ignore/suppress NPM errors.

## 1.0.0-beta.5 - 2022-09-06

* Added
  * Support for node 14 was enabled.
  * Support for handling when run via `npx`.
* Docs
  * Improve installation instructions and usage instructions.
* Misc
  * Improved test coverage.
* Build
  * Use _TypeScript_ `v4.8.2` now, was `v4.7.4`.

## 1.0.0-beta.4 - 2022-08-25

* Fixed
  * Run on Windows systems was fixed.
  * Improved error reporting.
  * Debug output was made clearer to understand.

## 1.0.0-beta.3 - 2022-08-23

* Change
  * The package no longer pins dependencies via shrinkwrap.

## 1.0.0-beta.2 - 2022-08-21

* Fixed
  * Debug output was made clearer to understand and less annoying.
* Style
  * Improved internal typing for OmittableDependencyTypes.

## 1.0.0-beta.1 - 2022-08-20

* First feature complete implementation.
