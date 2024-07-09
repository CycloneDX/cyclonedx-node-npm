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

const { createReadStream } = require('fs')

const MurmurHash3 = require('imurmurhash')

const { version: thisVersion } = require('../../package.json')

/**
 * @type {Map<string, Promise<string>>}
 */
const hfCache = new Map()

/**
 * @param {string} filePath
 * @return {Promise<string>}
 */
function hashFile (filePath) {
  let p = hfCache.get(filePath)
  if (p === undefined) {
    p = new Promise((resolve, reject) => {
      const hs = new MurmurHash3('')
      const rs = createReadStream(filePath, 'utf8')
      rs.on('data', c => hs.hash(c))
      rs.once('end', () => resolve(hs.result()))
      rs.once('error', e => reject(e))
    })
    hfCache.set(filePath, p)
  }
  return p
}

/**
 * @param {string} format
 * @param {*} data
 * @returns {string}
 */
function makeReproducible (format, data) {
  switch (format.toLowerCase()) {
    case 'xml':
      return makeXmlReproducible(data)
    case 'json':
      return makeJsonReproducible(data)
    default:
      throw new RangeError(`unexpected format: ${format}`)
  }
}

/**
 * @param {string} json
 * @returns {string}
 */
function makeJsonReproducible (json) {
  return json
    .replace(
      // replace metadata.tools.version
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-npm",\n' +
      `        "version": ${JSON.stringify(thisVersion)}`,
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-npm",\n' +
      '        "version": "thisVersion-testing"'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        "vendor": "@cyclonedx",\n' +
        '        "name": "cyclonedx-library",\n' +
        '        "version": ".+?"'
      ),
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-library",\n' +
      '        "version": "libVersion-testing"'
    )
}

/**
 * @param {string} xml
 * @returns {string}
 *
 * eslint-disable-next-line no-unused-vars
 */
function makeXmlReproducible (xml) {
  return xml
    .replace(
      // replace metadata.tools.version
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-npm</name>\n' +
      `        <version>${thisVersion}</version>`,
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-npm</name>\n' +
      '        <version>thisVersion-testing</version>'
    ).replace(
      // replace metadata.tools.version
      new RegExp(
        '        <vendor>@cyclonedx</vendor>\n' +
        '        <name>cyclonedx-library</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-library</name>\n' +
      '        <version>libVersion-testing</version>'
    )
}

module.exports = {
  hashFile,
  makeReproducible
}
