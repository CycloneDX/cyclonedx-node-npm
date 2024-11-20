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
const { spawnSync } = require('child_process')

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
      // replace npm in metadata.tools[].version
      new RegExp(
        '        "name": "npm",\n' +
        '        "version": ".+?"'
      ),
      '        "name": "npm",\n' +
      '        "version": "npmVersion-testing"'
    ).replace(
      // replace npm in metadata.tools.components[].version
      new RegExp(
        '          "name": "npm",\n' +
        '          "version": ".+?"'
      ),
      '          "name": "npm",\n' +
      '          "version": "npmVersion-testing"'
    ).replace(
      // replace self metadata.tools[].version
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-npm",\n' +
      `        "version": ${JSON.stringify(thisVersion)}`,
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-npm",\n' +
      '        "version": "thisVersion-testing"'
    ).replace(
      // replace self metadata.tools.components[].version
      '          "type": "application",\n' +
      '          "name": "cyclonedx-npm",\n' +
      '          "group": "@cyclonedx",\n' +
      `          "version": ${JSON.stringify(thisVersion)}`,
      '          "type": "application",\n' +
      '          "name": "cyclonedx-npm",\n' +
      '          "group": "@cyclonedx",\n' +
      '          "version": "thisVersion-testing"'
    ).replace(
      // replace library metadata.tools[].version
      new RegExp(
        '        "vendor": "@cyclonedx",\n' +
        '        "name": "cyclonedx-library",\n' +
        '        "version": ".+?"'
      ),
      '        "vendor": "@cyclonedx",\n' +
      '        "name": "cyclonedx-library",\n' +
      '        "version": "libVersion-testing"'
    ).replace(
      // replace library metadata.tools.components[].version
      new RegExp(
        '          "type": "library",\n' +
        '          "name": "cyclonedx-library",\n' +
        '          "group": "@cyclonedx",\n' +
        '          "version": ".+?"'
      ),
      '          "type": "library",\n' +
      '          "name": "cyclonedx-library",\n' +
      '          "group": "@cyclonedx",\n' +
      '          "version": "libVersion-testing"'
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
      // replace npm in metadata.tools[].version
      new RegExp(
        '        <name>npm</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <name>npm</name>\n' +
      '        <version>npmVersion-testing</version>'
    ).replace(
      // replace npm in metadata.tools.components[].version
      new RegExp(
        '          <name>npm</name>\n' +
        '          <version>.+?</version>'
      ),
      '          <name>npm</name>\n' +
      '          <version>npmVersion-testing</version>'
    ).replace(
      // replace metadata.tools[].version
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-npm</name>\n' +
      `        <version>${thisVersion}</version>`,
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-npm</name>\n' +
      '        <version>thisVersion-testing</version>'
    ).replace(
      // replace metadata.tools.components[].version
      '          <group>@cyclonedx</group>\n' +
      '          <name>cyclonedx-npm</name>\n' +
      `          <version>${thisVersion}</version>`,
      '          <group>@cyclonedx</group>\n' +
      '          <name>cyclonedx-npm</name>\n' +
      '          <version>thisVersion-testing</version>'
    ).replace(
      // replace metadata.tools[].version
      new RegExp(
        '        <vendor>@cyclonedx</vendor>\n' +
        '        <name>cyclonedx-library</name>\n' +
        '        <version>.+?</version>'
      ),
      '        <vendor>@cyclonedx</vendor>\n' +
      '        <name>cyclonedx-library</name>\n' +
      '        <version>libVersion-testing</version>'
    ).replace(
      // replace metadata.tools.components[].version
      '          <group>@cyclonedx</group>\n' +
      '          <name>cyclonedx-library</name>\n' +
      '          <version>.+?</version>',
      '          <group>@cyclonedx</group>\n' +
      '          <name>cyclonedx-library</name>\n' +
      '          <version>libVersion-testing</version>'
    )
}

/**
 * @return {number[]}
 */
function getNpmVersion () {
  const v = spawnSync('npm', ['--version'], {
    stdio: ['ignore', 'pipe', 'ignore'],
    encoding: 'utf8',
    shell: process.platform.startsWith('win')
  }).stdout.split('.').map(Number)
  process.stderr.write(`\ndetected npm version: ${JSON.stringify(v)}\n`)
  return v
}

/**
 * @param {string} s
 * @return {string}
 */
function regexEscape (s) {
  return s.replace(/[\^$(){}[\]+*?.|\\-]/g, '\\$&')
}

module.exports = {
  hashFile,
  makeReproducible,
  getNpmVersion,
  regexEscape
}
