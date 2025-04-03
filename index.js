/*!
This file is part of CycloneDX generator for NPM projects.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

SPDX-License-Identifier: Apache-2.0
Copyright (c) OWASP Foundation. All Rights Reserved.
*/

console.warn(`
There is no public API. Instead, there is a well-thought, stable CLI.
Call it programmatically like so:
    const { execFileSync } = require('child_process')
    const { constants: { MAX_LENGTH: BUFFER_MAX_LENGTH } } = require('buffer')
    const sbom = JSON.parse(execFileSync(process.execPath, [
        '.../path/to/this/package/bin/cyclonedx-npm-cli.js',
        '--output-format', 'JSON',
        '--output-file', '-'
        // additional CLI args
      ], {
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'buffer',
        maxBuffer: BUFFER_MAX_LENGTH
      }))
`)

module.exports = {/*
Intentionally, here are no exports.
See above!
*/}
