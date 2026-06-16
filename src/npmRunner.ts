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
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

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
  static readonly #npxMatcher = /(^|\\|\/)npx-cli\.js$/

  static readonly #winExecMatcher = /\.(exe|com)$/i
  static readonly #winCmdMatcher = /\.(cmd|bat)$/i

  constructor (process_: NodeJS.Process, console_: Console) {
    this.run = NpmRunner.#makeNpmRunner(process_, console_)
  }

  run: runFunc

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
      // `npm` must be used for executing `ls`.
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

  static #makeNpmRunner (process_: NodeJS.Process, console_: Console): runFunc {
    const isWin = process_.platform.startsWith('win')

    let execPath = NpmRunner.#getExecPath(process_, console_)
    if (execPath === undefined) {
      console_.debug('DEBUG | makeNpmRunner got no execPath, falling back to system lookup')
      try {
        execPath = isWin
          ? execSync('where npm').toString().split(/\r?\n/).filter(s => this.#winExecMatcher.test(s) || this.#winCmdMatcher.test(s))[0]
          : execSync('which npm').toString().trim()
        if (execPath === undefined) { throw new Error('npm not found') }
      } catch (error) {
        console_.debug('DEBUG | makeNpmRunner system lookup failed -', error);
        throw Error('Failed to locate "npm" on PATH', {cause: error})
      }
      console_.debug('DEBUG | makeNpmRunner resolved via system lookup: %s', execPath)
    } else {
      console_.debug('DEBUG | makeNpmRunner using execPath: %s', execPath)
    }

    if (NpmRunner.#jsMatcher.test(execPath)) {
      const nodeExecPath = process_.execPath
      console_.debug('DEBUG | makeNpmRunner caused execFileSync "%s" with "-- %s"', nodeExecPath, execPath)
      return (args, options) => execFileSync(nodeExecPath, ['--', execPath, ...args], options)
    }

    if (isWin && this.#winCmdMatcher.test(execPath)) {
      console_.debug('DEBUG | makeNpmRunner caused execFileSync "cmd.exe" with "/c %s"', execPath)
      return (args, options) => execFileSync('cmd.exe', ['/c', execPath, ...args], options)
    }

    console_.debug('DEBUG | makeNpmRunner caused execFileSync "%s"', execPath)
    return (args, options) => execFileSync(execPath, args, options)
  }
}
