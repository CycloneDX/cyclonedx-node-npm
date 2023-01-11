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

import { Builders, Enums, Factories, Serialize, Spec } from '@cyclonedx/cyclonedx-library'
import { Argument, Command, Option } from 'commander'
import { existsSync, openSync, writeSync } from 'fs'
import { dirname, resolve } from 'path'

import { BomBuilder, TreeBuilder } from './builders'
import { addLicenseTextsToBom } from './licensetexts.js'

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
  specVersion: Spec.Version
  flattenComponents: boolean
  shortPURLs: boolean
  outputReproducible: boolean
  addLicenseText: boolean
  outputFormat: OutputFormat
  outputFile: string
  mcType: Enums.ComponentType
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
      'Dependency types to omit from the installation tree.' +
      '(can be set multiple times)'
    ).choices(
      Object.values(Omittable)
    ).default(
      process.env.NODE_ENV === 'production'
        ? [Omittable.Dev]
        : [],
      '"dev" if the NODE_ENV environment variable is set to "production", otherwise empty'
    )
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
      'This causes information loss in trade of shorter PURLs, which might improve digesting these strings.'
    ).default(false)
  ).addOption(
    new Option(
      '--spec-version <version>',
      'Which version of CycloneDX spec to use.'
    ).choices(
      Object.keys(Spec.SpecVersionDict)
    ).default(
      Spec.Version.v1dot4
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
    new Option(
      '--add-license-text',
      'Whether to go the extra mile and add license texts from the package files.\n' +
      'This requires more resources, and results in much bigger output and \n' +
      'trust the package that the text in a license file corresponds to the one in package.json.'
    ).default(false)
  ).addOption(
    (function () {
      const o = new Option(
        '--output-format <format>',
        'Which output format to use.'
      ).choices(
        Object.values(OutputFormat)
      ).default(
        // the context is JavaScript - which should prefer JSON
        OutputFormat.JSON
      )
      const oldParseArg = o.parseArg ?? // might do input validation on choices, etc...
        (v => v) // fallback
      // @ts-expect-error TS2304
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
      '--mc-type <type>',
      'Type of the main component.'
    ).choices(
      // Object.values(Enums.ComponentType) -- use all possible
      [ // for the NPM context only the following make sense:
        Enums.ComponentType.Application,
        Enums.ComponentType.Firmware,
        Enums.ComponentType.Library
      ]
    ).default(
      Enums.ComponentType.Application
    )
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
    /* eslint-disable-next-line @typescript-eslint/no-var-requires */
    require('../package.json').version as string
  ).allowExcessArguments(
    false
  )
}

export function run (process: NodeJS.Process): void {
  process.title = 'cyclonedx-node-npm'

  // all output shall be bound to stdError - stdOut is for result output only
  const myConsole = new console.Console(process.stderr, process.stderr)

  const program = makeCommand(process)
  program.parse(process.argv)

  const options: CommandOptions = program.opts()
  myConsole.debug('DEBUG | options: %j', options)

  const packageFile = resolve(process.cwd(), program.args[0] ?? 'package.json')
  if (!existsSync(packageFile)) {
    throw new Error(`missing project's manifest file: ${packageFile}`)
  }
  myConsole.debug('DEBUG | packageFile: %s', packageFile)
  const projectDir = dirname(packageFile)
  myConsole.info('INFO  | projectDir: %s', projectDir)

  if (existsSync(resolve(projectDir, 'npm-shrinkwrap.json'))) {
    myConsole.debug('DEBUG | detected a npm shrinkwrap file')
  } else if (existsSync(resolve(projectDir, 'package-lock.json'))) {
    myConsole.debug('DEBUG | detected a package lock file')
  } else if (!options.packageLockOnly && existsSync(resolve(projectDir, 'node_modules'))) {
    myConsole.debug('DEBUG | detected a node_modules dir')
    // npm7 and later also might put a `node_modules/.package-lock.json` file
  } else {
    myConsole.log('LOG   | No evidence: no package lock file nor npm shrinkwrap file')
    if (!options.packageLockOnly) {
      myConsole.log('LOG   | No evidence: no node_modules dir')
    }
    myConsole.info('INFO  | ? Did you forget to run `npm install` on your project accordingly ?')
    throw new Error('missing evidence')
  }

  const extRefFactory = new Factories.FromNodePackageJson.ExternalReferenceFactory()

  const bom = new BomBuilder(
    new Builders.FromNodePackageJson.ToolBuilder(extRefFactory),
    new Builders.FromNodePackageJson.ComponentBuilder(
      extRefFactory,
      new Factories.LicenseFactory()
    ),
    new TreeBuilder(),
    new Factories.FromNodePackageJson.PackageUrlFactory('npm'),
    {
      ignoreNpmErrors: options.ignoreNpmErrors,
      metaComponentType: options.mcType,
      packageLockOnly: options.packageLockOnly,
      omitDependencyTypes: options.omit,
      reproducible: options.outputReproducible,
      flattenComponents: options.flattenComponents,
      shortPURLs: options.shortPURLs
    },
    myConsole
  ).buildFromProjectDir(projectDir, process)

  if (options.addLicenseText) {
    addLicenseTextsToBom(projectDir, bom)
  }

  const spec = Spec.SpecVersionDict[options.specVersion]
  if (undefined === spec) {
    throw new Error('unsupported spec-version')
  }

  let serializer: Serialize.Types.Serializer
  switch (options.outputFormat) {
    case OutputFormat.XML:
      serializer = new Serialize.XmlSerializer(new Serialize.XML.Normalize.Factory(spec))
      break
    case OutputFormat.JSON:
      serializer = new Serialize.JsonSerializer(new Serialize.JSON.Normalize.Factory(spec))
      break
  }

  // TODO use instead ? : https://www.npmjs.com/package/debug ?
  myConsole.log('LOG   | writing BOM to', options.outputFile)
  writeSync(
    options.outputFile === OutputStdOut
      ? process.stdout.fd
      : openSync(resolve(process.cwd(), options.outputFile), 'w'),
    serializer.serialize(bom, {
      sortLists: options.outputReproducible,
      space: 2
    })
  )
}
