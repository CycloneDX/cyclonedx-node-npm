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

import { Builders, Enums, Factories, Serialize, Spec, Validation } from '@cyclonedx/cyclonedx-library'
import { Argument, Command, Option } from 'commander'
import { existsSync, mkdirSync, openSync } from 'fs'
import { dirname, resolve } from 'path'

import { loadJsonFile, writeAllSync } from './_helpers'
import { BomBuilder, TreeBuilder } from './builders'
import { makeConsoleLogger } from './logger'

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
  includeWorkspaceRoot: boolean
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

function makeCommand (process: NodeJS.Process): Command {
  return new Command(
  ).description(
    'Create CycloneDX Software Bill of Materials (SBOM) from Node.js NPM projects.'
  ).usage(
    // Need to add the `[--]` manually, to indicate how to stop a variadic option.
    '[options] [--] [<package-manifest>]'
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
      'Dependency types to omit from the installation tree. ' +
      '(can be set multiple times)'
    ).choices(
      Object.values(Omittable).sort()
    ).default(
      process.env.NODE_ENV === 'production'
        ? [Omittable.Dev]
        : [],
      `"${Omittable.Dev}" if the NODE_ENV environment variable is set to "production", otherwise empty`
    )
  ).addOption(
    new Option(
      '-w, --workspace <workspace...>',
      'Whether to only include dependencies for a specific workspace. ' +
      '(can be set multiple times)\n' +
      'This feature is experimental.'
    ).default([], 'empty')
  ).addOption(
    new Option(
      '-ws, --workspaces',
      'Whether to include dependencies for workspaces.\n' +
      'Default behaviour for NPM 7 is to not include workspace dependencies but for NPM > 7 the default behaviour is to include them.\n' +
      'Default behaviour includes workspace root dependencies (--include-workspace-root) ' +
      'but if explicitly enabled then this is not the case (disabled by default).\n' +
      'If explicitly enabled an error will occur if there are no configured workspaces.\n' +
      'This feature is experimental.'
    ).default(undefined)
  ).addOption(
    new Option(
      '--no-workspaces',
      'Whether to exclude dependencies for workspaces.\n' +
      'This feature is experimental.'
    )
  ).addOption(
    new Option(
      '--include-workspace-root',
      'Include the workspace root when workspaces are defined using `-w` or `--workspace`; or if `--workspaces` is configured.\n' +
      'This feature is experimental.'
    ).default(false)
  ).addOption(
    new Option(
      '--gather-license-texts',
      'Search for license files in components and include them as license evidence.\n' +
      'This feature is experimental.'
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
      '--spec-version <version>',
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
    (function () {
      const o = new Option(
        '--output-format <format>',
        'Which output format to use.'
      ).choices(
        [OutputFormat.JSON, OutputFormat.XML]
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
      '--output-file <file>',
      'Path to the output file.\n' +
      `Set to "${OutputStdOut}" to write to STDOUT.`
    ).default(
      OutputStdOut,
      'write to STDOUT'
    )
  ).addOption(
    new Option(
      '--validate',
      'Validate resulting BOM before outputting. ' +
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
      // Object.values(Enums.ComponentType) -- use all possible
      [ // for the NPM context only the following make sense:
        Enums.ComponentType.Application,
        Enums.ComponentType.Firmware,
        Enums.ComponentType.Library
      ].sort()
    ).default(
      Enums.ComponentType.Application
    )
  ).addOption(
    new Option(
      '-v, --verbose',
      'Increase the verbosity of messages. Use multiple times to increase the verbosity even more.'
    ).argParser<number>(
      function (_: any, previous: number): number {
        return previous + 1
      }
    ).default(0)
  ).addArgument(
    new Argument(
      '[<package-manifest>]',
      "Path to project's manifest file."
    ).default(
      'package.json',
      '"package.json" file in current working directory'
    )
  ).version(
    // that is supposed to be the last option in the list on the help page.
    loadJsonFile(resolve(module.path, '..', 'package.json')).version as string
  ).allowExcessArguments(
    false
  )
}

const ExitCode: Readonly<Record<string, number>> = Object.freeze({
  SUCCESS: 0,
  FAILURE: 1,
  INVALID: 2
})

export async function run (process: NodeJS.Process): Promise<number> {
  process.title = 'cyclonedx-node-npm'

  const program = makeCommand(process)
  program.parse(process.argv)

  const options: CommandOptions = program.opts()
  const myConsole = makeConsoleLogger(process, options.verbose)
  myConsole.debug('DEBUG | options: %j', options)

  const packageFile = resolve(process.cwd(), program.args[0] ?? 'package.json')
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

  if (options.workspaces === false) {
    if (options.workspace !== undefined && options.workspace.length > 0) {
      myConsole.error('ERROR | Bad config: `--workspace` option cannot be used when `--no-workspaces` is also configured')
      throw new Error('bad config')
    }
  }

  if (options.includeWorkspaceRoot) {
    if (options.workspace.length === 0 && options.workspaces !== true) {
      myConsole.error('ERROR | Bad config: `--include-workspace-root` can only be used when `--workspace` or `--workspaces` is also configured')
      throw new Error('bad config')
    }
  }

  myConsole.log('LOG   | gathering BOM data ...')
  const bom = new BomBuilder(
    new Builders.FromNodePackageJson.ComponentBuilder(
      new Factories.FromNodePackageJson.ExternalReferenceFactory(),
      new Factories.LicenseFactory()
    ),
    new TreeBuilder(),
    new Factories.FromNodePackageJson.PackageUrlFactory('npm'),
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
  ).buildFromProjectDir(projectDir, process)

  const spec = Spec.SpecVersionDict[options.specVersion]
  if (undefined === spec) {
    throw new Error('unsupported spec-version')
  }

  let serializer: Serialize.Types.Serializer
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
        myConsole.error('ERROR | unexpected error')
        throw err
      }
    }
  }
  const directory = dirname(options.outputFile)
  if (!existsSync(directory)) {
    myConsole.info('INFO  | creating directory', directory)
    mkdirSync(directory, { recursive: true })
  }
  myConsole.log('LOG   | writing BOM to', options.outputFile)
  const written = await writeAllSync(
    options.outputFile === OutputStdOut
      ? process.stdout.fd
      : openSync(resolve(process.cwd(), options.outputFile), 'w'),
    serialized
  )
  myConsole.info('INFO  | wrote %d bytes to %s', written, options.outputFile)

  return written > 0
    ? ExitCode.SUCCESS
    : ExitCode.FAILURE
}
