import { execFileSync, execSync, ExecSyncOptionsWithBufferEncoding } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

/** !attention: args might not be shell-save. */
export declare type runFunc = (args: string[], options: ExecSyncOptionsWithBufferEncoding) => Buffer

/**
 * Matches the filename for the npx cli script in a given path:
 *
 * Matches:
 *   - npx-cli.js     // plain
 *   - foo/npx-cli.js // unix-like paths
 *   - foo\npx-cli.js // windows-like paths
 *
 * Does not match:
 *   - foobar/            // Not the filename
 *   - foobar-npx-cli.js  // Invalid leading string
 *   - foo/npx-cli_js     // Invalid extension
 *   - npx-cli.js/foo.sh  // Directory of the same name
 */
const npxMatcher = /(^|\\|\/)npx-cli\.js$/

const jsMatcher = /\.[cm]?js$/

/**
 * @throws {Error} when npm path unexpected
 */
function getExecPath (process: NodeJS.Process, console_: Console): string | undefined {
  // `npm_execpath` will be whichever cli script has called this application by npm.
  // This can be `npm`, `npx`, or `undefined` if called by `node` directly.
  const execPath = process.env.npm_execpath ?? ''
  if (execPath === '') {
    return undefined
  }

  if (npxMatcher.test(execPath)) {
    // `npm` must be used for executing `ls`.
    console_.debug('DEBUG | command: npx-cli.js usage detected, checking for npm-cli.js ...')
    // Typically `npm-cli.js` is alongside `npx-cli.js`, as such we attempt to use this and validate it exists.
    // Replace the script in the path, and normalise it with resolve (eliminates any extraneous path separators).
    const npmPath = resolve(execPath.replace(npxMatcher, '$1npm-cli.js'))
    if (existsSync(npmPath)) {
      return npmPath
    }
  } else if (existsSync(execPath)) {
    return execPath
  }

  throw new Error(`unexpected NPM execPath: ${execPath}`)
}

export function makeNpmRunner (process: NodeJS.Process, console_: Console): runFunc {
  const execPath = getExecPath(process, console_)
  if (execPath === undefined) {
    console_.debug('DEBUG | makeNpmRunner caused execSync "npm"')
    // not shell-save - but this is okay four our use case - since we have complete control over `args` in the caller.
    return (args, options) => execSync('npm ' + args.join(' '), options)
  }

  if (jsMatcher.test(execPath)) {
    const nodeExecPath = process.execPath
    console_.debug('DEBUG | makeNpmRunner caused execFileSync "%s" with  "-- %s"', nodeExecPath, execPath)
    return (args, options) => execFileSync(nodeExecPath, ['--', execPath, ...args], options)
  }

  console_.debug('DEBUG | makeNpmRunner caused execFileSync "%s"', execPath)
  return (args, options) => execFileSync(execPath, args, options)
}
