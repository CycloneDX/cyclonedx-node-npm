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

import {existsSync, mkdirSync, openSync} from 'node:fs'
import {dirname, resolve} from 'node:path'

import {Builders, Enums, Factories, Serialize, Spec, Utils, Validation} from '@cyclonedx/cyclonedx-library'
import {Argument, Command, Option} from 'commander'

import {loadJsonFile, type Version, versionCompare, versionTuple, writeAllSync} from './_helpers'
import {BomBuilder, TreeBuilder} from './builders'
import {makeConsoleLogger} from './logger'
import {NpmRunner} from './npmRunner'

enum OutputFormat {
  JSON = 'JSON',
  XML = 'XML',
}

enum Omittable {
  Dev = 'dev',
  Optional = 'optional',
  Peer = 'peer',
}

const OutputStdOut = '-'

interface CommandOptions {
  ignoreNpmErrors: boolean
  packageLockOnly: boolean
  omit: Omittable[]
  workspace: string[]
  includeWorkspaceRoot: boolean | undefined
  workspaces: boolean | undefined
  gatherLicenseTexts: boolean
  flattenComponents: boolean
  shortPURLs: boolean
  outputReproducible: boolean
  specVersion: Spec.Version
  outputFormat: OutputFormat
  outputFile: string
  validate: boolean | undefined
  mcType: Enums.ComponentType
  verbose: number
}

function makeCommand(process_: NodeJS.Process): Command {
  return new Command(
    /* auto-set the name */
  ).description(
    'Create CycloneDX Software Bill of Materials (SBOM) from Node.js NPM projects.'
  ).usage(
    // Need to add the `[--]` manually, to indicate how to stop a variadic option.
    '[options] [--] [<package-manifest>]'
  ).version(
    // that is supposed to be the last option in the list on the help page.
    /* eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion, @typescript-eslint/no-unsafe-member-access -- ack */
    loadJsonFile(resolve(module.path, '..', 'package.json')).version as string
  ).addOption(
    new Option(
      '--ignore-npm-errors',
      'Whether to ignore errors of NPM.\n' +
      'This might be used, if "npm install" was run with "--force" or "--legacy-peer-deps".'
    ).default(false)
  ).addOption(
    new Option(
      '--package-lock-only',
      'Whether to only use the lock file, ignoring "node_modules".\n' +
      'This means the output will be based only on the few details in and the tree described by the "npm-shrinkwrap.json" or "package-lock.json", rather than the contents of "node_modules" directory.'
    ).default(false)
  ).addOption(
    new Option(
      '--omit <type...>',
      'Dependency types to omit from the installation tree.' +
      ' (can be set multiple times)'
    ).choices(
      Object.values(Omittable).sort()
    ).default(
      process_.env.NODE_ENV === 'production'
        ? [Omittable.Dev]
        : [],
      `"${Omittable.Dev}" if the NODE_ENV environment variable is set to "production", otherwise empty`
    )
  ).addOption(
    new Option(
      '-w, --workspace <workspace...>',
      'Only include dependencies for specific workspaces.' +
      ' (can be set multiple times)' +
      '\nThis feature is experimental.'
    ).default([], 'empty')
  ).addOption(
    new Option(
      '--no-workspaces',
      'Do not include dependencies for workspaces.\n' +
      'Default behaviour is to include dependencies for all configured workspaces.\n' +
      'This cannot be used if workspaces have been explicitly defined using `--workspace`.' +
      '\nThis feature is experimental.'
    ).default(
      undefined
    ).conflicts('workspace')
  ).addOption(
    new Option(
      '--include-workspace-root',
      "Include workspace root dependencies along with explicitly defined workspaces' dependencies. " +
      'This can only be used if you have explicitly defined workspaces using `--workspace`.\n' +
      'Default behaviour is to not include the workspace root when workspaces are explicitly defined using `--workspace`.' +
      '\nThis feature is experimental.'
    ).default(undefined)
  ).addOption(
    new Option(
      '--no-include-workspace-root',
      'Do not include workspace root dependencies. ' +
      'This only has an effect if you have one or more workspaces configured in your project.\n' +
      'This is useful if you want to include all dependencies for all workspaces without explicitly defining them with `--workspace` (default behaviour) but you do not want the workspace root dependencies included.' +
      '\nThis feature is experimental.'
    ).default(undefined)
  ).addOption(
    new Option(
      '--gather-license-texts',
      'Search for license files in components and include them as license evidence.' +
      '\nThis feature is experimental.'
    ).default(false)
  ).addOption(
    new Option(
      '--flatten-components',
      'Whether to flatten the components.\n' +
      'This means the actual nesting of node packages is not represented in the SBOM result.'
    ).default(false)
  ).addOption(
    new Option(
      '--short-PURLs',
      'Omit all qualifiers from PackageURLs.\n' +
      'This causes information loss in trade-off shorter PURLs, which might improve ingesting these strings.'
    ).default(false)
  ).addOption(
    new Option(
      '--sv, --spec-version <version>',
      'Which version of CycloneDX spec to use.'
    ).choices(
      Object.keys(Spec.SpecVersionDict).sort()
    ).default(
      Spec.Version.v1dot6
    )
  ).addOption(
    new Option(
      '--output-reproducible',
      'Whether to go the extra mile and make the output reproducible.\n' +
      'This requires more resources, and might result in loss of time- and random-based-values.'
    ).env(
      'BOM_REPRODUCIBLE'
    )
  ).addOption(
    (() => {
      const o = new Option(
        '--of, --output-format <format>',
        'Which output format to use.'
      ).choices(
        Object.values(OutputFormat).sort()
      ).default(
        // the context is node/JavaScript - which should prefer JSON
        OutputFormat.JSON
      )
      const oldParseArg = o.parseArg ?? // might do input validation on choices, etc...
        (v => v) // fallback: pass-through
      /* @ts-expect-error TS2304 */
      o.parseArg = (v, p) => oldParseArg(v.toUpperCase(), p)
      return o
    })()
  ).addOption(
    new Option(
      '-o, --output-file <file>',
      'Path to the output file.\n' +
      `Set to "${OutputStdOut}" to write to STDOUT.`
    ).default(
      OutputStdOut,
      'write to STDOUT'
    )
  ).addOption(
    new Option(
      '--validate',
      'Validate resulting BOM before outputting.\n' +
      'Validation is skipped, if requirements not met. See the README.'
    ).default(undefined)
  ).addOption(
    new Option(
      '--no-validate',
      'Disable validation of resulting BOM.'
    )
  ).addOption(
    new Option(
      '--mc-type <type>',
      'Type of the main component.'
    ).choices(
      // Object.values(Enums.ComponentType) -- use all possible values
      [ // for the NPM context only the following make sense:
        Enums.ComponentType.Application,
        Enums.ComponentType.Firmware,
        Enums.ComponentType.Library
      ].sort()
    ).default(Enums.ComponentType.Application)
  ).addOption(
    new Option(
      '-v, --verbose',
      'Increase the verbosity of messages.\n' +
      'Use multiple times to increase the verbosity even more.'
    ).argParser<number>(
      (_, previous) => previous + 1
    ).default(0)
  ).addArgument(
    new Argument(
      '[<package-manifest>]',
      "Path to project's manifest file."
    ).default(
      'package.json',
      '"package.json" file in current working directory'
    )
  ).allowExcessArguments(
    false
  )
}

const enum ExitCode {
  SUCCESS = 0,
  FAILURE = 1,
  INVALID = 2
}

const npmMinVersion: Version = Object.freeze([9, 0, 0])

/* eslint-disable-next-line complexity -- ack */
export async function run(process_: NodeJS.Process): Promise<number> {
  process_.title = 'cyclonedx-node-npm' /* eslint-disable-line  no-param-reassign -- ack */

  const program = makeCommand(process_)
  program.parse(process_.argv)

  const options: CommandOptions = program.opts()
  const myConsole = makeConsoleLogger(process_, options.verbose)
  myConsole.debug('DEBUG | options: %j', options)
  myConsole.debug('DEBUG | args: %j', program.args)

  const npmRunner = new NpmRunner(process_, myConsole)
  const npmVersion = npmRunner.getVersion({env: process_.env})
  if (versionCompare(versionTuple(npmVersion), npmMinVersion) < 0) {
    throw new RangeError('Unsupported NPM version. ' +
      `Expected >= ${npmMinVersion.join('.')}, got ${npmVersion}`)
  }
  myConsole.debug('DEBUG | found NPM version %j', npmVersion)

  // Commander will default this option to true as there
  // is no positive boolean parameter (we define --no-workspaces but
  // no --workspaces).
  if (options.workspaces === true) {
    options.workspaces = undefined
  }

  if (options.includeWorkspaceRoot === true && options.workspace.length === 0) {
    throw new Error(
      "option '--include-workspace-root' cannot be used without option '-w, --workspace <workspace...>'")
  }

  const packageFile = resolve(process_.cwd(), program.args[0] ?? 'package.json')
  if (!existsSync(packageFile)) {
    throw new Error(`missing project's manifest file: ${packageFile}`)
  }
  myConsole.debug('DEBUG | packageFile:', packageFile)
  const projectDir = dirname(packageFile)
  myConsole.info('INFO  | projectDir:', projectDir)

  if (existsSync(resolve(projectDir, 'npm-shrinkwrap.json'))) {
    myConsole.info('INFO  | detected a npm shrinkwrap file')
  } else if (existsSync(resolve(projectDir, 'package-lock.json'))) {
    myConsole.info('INFO  | detected a package lock file')
  } else if (!options.packageLockOnly && existsSync(resolve(projectDir, 'node_modules'))) {
    myConsole.info('INFO  | detected a `node_modules` dir')
    // npm7 and later also might put a `node_modules/.package-lock.json` file
  } else {
    myConsole.warn('WARN  | ? Did you forget to run `npm install` on your project accordingly ?')
    myConsole.error('ERROR | No evidence: no package lock file nor npm shrinkwrap file')
    if (!options.packageLockOnly) {
      myConsole.error('ERROR | No evidence: no `node_modules` dir')
    }
    throw new Error('missing evidence')
  }

  if (options.gatherLicenseTexts && options.packageLockOnly) {
    myConsole.warn('WARN  | Adding license text is ignored (package-lock-only is configured!)')
    options.gatherLicenseTexts = false
  }

  myConsole.log('LOG   | gathering BOM data ...')
  const bom = new BomBuilder(
    npmRunner,
    new Builders.FromNodePackageJson.ComponentBuilder(
      new Factories.FromNodePackageJson.ExternalReferenceFactory(),
      new Factories.LicenseFactory()
    ),
    new TreeBuilder(),
    new Factories.FromNodePackageJson.PackageUrlFactory('npm'),
    new Utils.LicenseUtility.LicenseEvidenceGatherer(),
    {
      ignoreNpmErrors: options.ignoreNpmErrors,
      metaComponentType: options.mcType,
      packageLockOnly: options.packageLockOnly,
      omitDependencyTypes: options.omit,
      gatherLicenseTexts: options.gatherLicenseTexts,
      reproducible: options.outputReproducible,
      flattenComponents: options.flattenComponents,
      shortPURLs: options.shortPURLs,
      workspace: options.workspace,
      includeWorkspaceRoot: options.includeWorkspaceRoot,
      workspaces: options.workspaces
    },
    myConsole
  ).buildFromProjectDir(projectDir, process_)

  const spec = Spec.SpecVersionDict[options.specVersion]
  if (undefined === spec) {
    throw new Error('unsupported spec-version')
  }

  /* eslint-disable-next-line  @typescript-eslint/init-declarations -- needed */
  let serializer: Serialize.Types.Serializer
  /* eslint-disable-next-line  @typescript-eslint/init-declarations -- needed */
  let validator: Validation.Types.Validator
  switch (options.outputFormat) {
    case OutputFormat.XML:
      serializer = new Serialize.XmlSerializer(new Serialize.XML.Normalize.Factory(spec))
      validator = new Validation.XmlValidator(spec.version)
      break
    case OutputFormat.JSON:
      serializer = new Serialize.JsonSerializer(new Serialize.JSON.Normalize.Factory(spec))
      validator = new Validation.JsonValidator(spec.version)
      break
  }

  myConsole.log('LOG   | serializing BOM ...')
  const serialized = serializer.serialize(bom, {
    sortLists: options.outputReproducible,
    space: 2
  })

  if (options.validate ?? true) {
    myConsole.log('LOG   | try validating BOM result ...')
    try {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- false-positive  */
      const validationErrors = await validator.validate(serialized)
      if (validationErrors === null) {
        myConsole.info('INFO  | BOM result appears valid')
      } else {
        myConsole.debug('DEBUG | BOM result invalid. details: ', validationErrors)
        myConsole.error('ERROR | Failed to generate valid BOM.')
        myConsole.warn(
          'WARN  | Please report the issue and provide the npm lock file of the current project to:\n' +
          '      | https://github.com/CycloneDX/cyclonedx-node-npm/issues/new?template=ValidationError-report.md&labels=ValidationError&title=%5BValidationError%5D')
        return ExitCode.FAILURE
      }
    } catch (err) {
      if (err instanceof Validation.MissingOptionalDependencyError) {
        if (options.validate === true) {
          // if explicitly requested to validate, then warn about skip
          myConsole.warn('WARN  | skipped validating BOM:', err.message)
          // @TODO breaking change: forward error, do not skip/continue
        } else {
          myConsole.info('INFO  | skipped validating BOM:', err.message)
        }
      } else {
        myConsole.debug('DEBUG | unexpected error. details: ', err)
        myConsole.error('ERROR | unexpected error')
        throw err
      }
    }
  }

  let outputFD: number = process_.stdout.fd
  if (options.outputFile !== OutputStdOut) {
    const outputFPn = resolve(process_.cwd(), options.outputFile)
    myConsole.debug('DEBUG | outputFPn:', outputFPn)
    const outputFDir = dirname(outputFPn)
    if (!existsSync(outputFDir)) {
      myConsole.info('INFO  | creating directory', outputFDir)
      mkdirSync(outputFDir, {recursive: true})
    }
    outputFD = openSync(outputFPn, 'w')
  }
  myConsole.log('LOG   | writing BOM to: %s', options.outputFile)
  const written = await writeAllSync(outputFD, serialized)
  myConsole.info('INFO  | wrote %d bytes to: %s', written, options.outputFile)

  return written > 0
    ? ExitCode.SUCCESS
    : ExitCode.FAILURE
}
