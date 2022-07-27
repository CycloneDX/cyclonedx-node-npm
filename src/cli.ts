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

import { resolve, dirname } from 'path'
import { writeSync, openSync, existsSync } from 'fs'

import { Command, Option, Argument } from 'commander'
import { Enums, Spec, Serialize, Builders, Factories } from '@cyclonedx/cyclonedx-library'

import { BomBuilder } from './builder'

enum OutputFormat {
  JSON = 'JSON',
  XML = 'XML',
}

const OutputStdOut = '-'

interface CommandOptions {
  excludeDev: boolean
  specVersion: Spec.Version
  outputReproducible: boolean
  outputFormat: OutputFormat
  outputFile: string
  mcType: Enums.ComponentType
}

function makeCommand (): Command {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { name: selfName, version: selfVersion } = require('../package.json')

  return new Command(
  ).summary(
    'Create CycloneDX Software Bill of Materials (SBOM) from Node.js NPM projects.'
  ).version(
    `${selfName as string} ${selfVersion as string}`
  ).addOption(
    new Option(
      '--exclude-dev',
      'Exclude dev dependencies.'
    )
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
      'Reproducibility might result in loss of time- and random-based-values.'
    ).env(
      'BOM_REPRODUCIBLE'
    )
  ).addOption(
    new Option(
      '--output-format <format>',
      'Which output format to use.'
    ).choices(
      Object.values(OutputFormat)
    ).default(
      // the context is JavaScript - which should prefer JSON
      OutputFormat.JSON
    )
  ).addOption(
    new Option(
      '--output-file <file>',
      `Path to the output file. Set to "${OutputStdOut}" to write to STDOUT.`
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
      '"package.json" file in current working directory.'
    )
  ).allowExcessArguments(
    false
  )
}

export function run (
  process: NodeJS.Process
): void {
  process.title = 'cyclonedx-node-npm'

  const program = makeCommand()
  program.parse(process.argv)

  const options: CommandOptions = program.opts()
  const packageFile = resolve(process.cwd(), program.args[0] ?? 'package.json')
  const projectDir = dirname(packageFile)

  if (!existsSync(packageFile)) {
    const msg = 'missing package manifest file'
    program.error(msg)
    throw new Error(msg)
  }

  /**
   * The path to the used npm lock file.
   *
   * > If both `package-lock.json` and `npm-shrinkwrap.json` are present in a package root,
   * > `npm-shrinkwrap.json` will be preferred over the `package-lock.json` file.
   * source: {@link https://docs.npmjs.com/cli/v8/configuring-npm/npm-shrinkwrap-json}
   */
  let lockFile: string
  const shrinkwrapFile = resolve(projectDir, 'npm-shrinkwrap.json')
  const packageLockFile = resolve(projectDir, 'package-lock.json')
  if (existsSync(shrinkwrapFile)) {
    lockFile = shrinkwrapFile
  } else if (existsSync(packageLockFile)) {
    lockFile = packageLockFile
  } else {
    const msg = 'missing package lock file, missing npm shrinkwrap file'
    program.error(msg)
    throw new Error(msg)
  }

  const bom = new BomBuilder(
    new Builders.FromPackageJson.ToolBuilder(
      new Factories.FromPackageJson.ExternalReferenceFactory()
    ),
    {
      metaComponentType: options.mcType,
      excludeDevDependencies: options.excludeDev,
      reproducible: options.outputReproducible
    }
  ).buildFromPackageJson(lockFile)

  const spec = Spec.SpecVersionDict[options.specVersion]
  if (undefined === spec) {
    const msg = 'unsupported spec-version'
    program.error(msg)
    throw new Error(msg)
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

  writeSync(
    options.outputFile === OutputStdOut
      ? process.stdout.fd
      : openSync(options.outputFile, 'w'),
    serializer.serialize(bom, {
      sortLists: options.outputReproducible,
      space: 2
    })
  )
}
