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

import { type CommonExecOptions, execFileSync, execSync, type ExecSyncOptionsWithBufferEncoding } from 'node:child_process'
import { existsSync, mkdtempDisposableSync, openSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

/** !attention: args might not be shell-save. */
type runFunc = (args: string[], options: ExecSyncOptionsWithBufferEncoding) => Buffer

export class NpmRunner {
  static readonly #jsMatcher = /\.[cm]?js$/

  /**
   * Matches the filename for the npx cli script in a given path:
   *
   * Matches:
   *   - npx-cli.js        // plain
   *   - foo/npx-cli.js    // unix-like paths
   *   - foo\\npx-cli.js   // windows-like paths
   *
   * Does not match:
   *   - foobar/            // Not the filename
   *   - foobar-npx-cli.js  // Invalid leading string
   *   - foo/npx-cli_js     // Invalid extension
   *   - npx-cli.js/foo.sh  // Directory of the same name
   */
  static readonly #npxMatcher = /(^|\\|\/)npx-cli\.[cm]?js$/

  run: runFunc

  constructor (process_: NodeJS.Process, console_: Console) {
    this.run = NpmRunner.#makeNpmRunner(process_, console_)
  }


  #version: string | undefined

  getVersion (options: CommonExecOptions = {}): string {
    if (this.#version === undefined) {
      this.#version = this.run(['--version'], {
        ...options,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'buffer',
        maxBuffer: Number.MAX_SAFE_INTEGER // DIRTY but effective
      }).toString().trim()
    }
    return this.#version
  }

  static #getExecPath (process_: NodeJS.Process, console_: Console): string | undefined {
    // `npm_execpath` will be whichever cli script has called this application by npm.
    // This can be `npm`, `npx`, or `undefined` if called by `node` directly.
    const execPath = process_.env.npm_execpath ?? ''
    if (execPath === '') {
      return undefined
    }

    if (NpmRunner.#npxMatcher.test(execPath)) {
      // https://github.com/npm/cli/issues/6662
      console_.debug('DEBUG | command: npx-cli.js usage detected, checking for npm-cli.js ...')
      // Typically `npm-cli.js` is alongside `npx-cli.js`, as such we attempt to use this and validate it exists.
      // Replace the script in the path, and normalise it with resolve (eliminates any extraneous path separators).
      const npmPath = resolve(execPath.replace(NpmRunner.#npxMatcher, '$1npm-cli.js'))
      if (existsSync(npmPath)) {
        return npmPath
      }
    } else if (existsSync(execPath)) {
      return execPath
    }

    throw new Error(`unexpected NPM execPath: ${execPath}`)
  }

  static #getSystemNpmPath(console_: Console): string {
    console_.debug('DEBUG | looking up system NPM...')
    /* eslint-disable-next-line no-useless-assignment -- ack */
    let npmPath = ''

    const tmpDir = mkdtempDisposableSync(join(tmpdir(), 'cyclonedx-npm_execpath-'))
    try {
      writeFileSync(
        openSync(join(tmpDir.path, 'package.json'), 'w'),
        JSON.stringify({
          'private': true,
          'name': '@cyclonedx/cyclonedx-npm_execpath',
          'scripts': {
            // no quotes - stay OS independent
            'npm_execpath': 'node -p process.env.npm_execpath'
          }
        }))
      npmPath = execSync('npm --silent run npm_execpath', {
        cwd: tmpDir.path,
        stdio: ['ignore', 'pipe', 'ignore'],
        encoding: 'buffer',
        maxBuffer: Number.MAX_SAFE_INTEGER // DIRTY but effective
      }).toString().trim()
    } catch (err) {
      throw new Error('Failed looking up NPM', { cause: err })
    } finally {
      tmpDir.remove()
    }

    if (npmPath === '' || !existsSync(npmPath)) {
      throw new Error(`Missing system NPM ${JSON.stringify(npmPath)}`)
    }
    console_.debug('DEBUG | system NPM found: %s', npmPath)
    return npmPath
  }

  static #makeNpmRunner (process_: NodeJS.Process, console_: Console): runFunc {
    const execPath = NpmRunner.#getExecPath(process_, console_)
      ?? NpmRunner.#getSystemNpmPath(console_)

    if (!NpmRunner.#jsMatcher.test(execPath)) {
      throw new Error(`unexpected NPM execPath: ${execPath}`)
    }

    const nodeExecPath = process_.execPath
    console_.debug('DEBUG | makeNpmRunner caused execFileSync "%s" with "-- %s"', nodeExecPath, execPath)
    return (args, options) => execFileSync(nodeExecPath, ['--', execPath, ...args], options)
  }
}
