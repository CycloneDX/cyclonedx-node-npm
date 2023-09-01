#!/usr/bin/env node
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

const assert = require('assert')
const { resolve } = require('path')

if (process.argv[2] === '--version') {
  process.stdout.write(`${process.env.CT_VERSION}\n`)
  process.exit(0)
}

process.exitCode = Number(process.env.CT_EXIT_CODE || 0)

const expectedArgs = ['ls', ...process.env.CT_EXPECTED_ARGS.split(' ')]
assert.deepStrictEqual(process.argv.slice(2), expectedArgs, 'unexpected args')

const packagePath = resolve(__dirname, '..', 'dummy_projects', 'no-lockfile')
process.stdout.write(`{
  "name": "dummy",
  "private": true,
  "extraneous": false,
  "path": ${JSON.stringify(packagePath)},
  "_dependencies": {},
  "devDependencies": {},
  "peerDependencies": {}
}`)
