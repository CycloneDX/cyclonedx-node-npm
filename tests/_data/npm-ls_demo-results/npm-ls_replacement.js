#!/usr/bin/env node
'use strict'

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
const { createReadStream } = require('fs')

// console.error('debug:', 'env=%j', process.env)

process.exitCode = Number(process.env.CT_EXIT_CODE ?? 0)

if (process.env.CT_SUBJECT === 'broken-json') {
  process.stdout.write('{"broken-json"')
  process.exit()
}

const index = require('./').index()

const expectedArgs = process.env.CT_EXPECTED_ARGS.split(' ')
assert.deepStrictEqual(process.argv.slice(2), expectedArgs, 'unexpected args')

const { CT_SUBJECT: subject, CT_NPM: npm, CT_NODE: node, CT_OS: os } = process.env
const matches = index.filter(i => i.subject === subject && i.npm === npm && i.node === node && i.os === os)
assert.strictEqual(matches.length, 1, 'did not find exactly 1 match')

const { path } = matches[0]

const rs = createReadStream(path)
rs.once('error', e => { throw e })
rs.once('open', () => { rs.pipe(process.stdout) })
rs.once('end', () => { rs.unpipe(); rs.close() })
