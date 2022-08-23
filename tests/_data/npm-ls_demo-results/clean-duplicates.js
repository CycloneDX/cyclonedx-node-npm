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

const { unlinkSync } = require('fs')

const { hashFile } = require('../../_helper')
const { index } = require('.')

async function main () {
  const files = index().map(i => i.path)
  const hashes = new Map()

  for (const file of files) {
    const hash = await hashFile(file)
    const double = hashes.get(hash)
    if (double === undefined) {
      hashes.set(hash, file)
      console.info(`${hash}: ${file} unique -> keep`)
      continue
    }
    console.log(`${hash}: ${file} duplicates ${double} -> delete`)
    // unlinkSync(file)
  }
  console.log('-------------')
  console.log('SUMMARY: kept')
  for (const [hash, file] of hashes )
  {
    console.log(`${hash}: ${file}`)
  }
}

main()
