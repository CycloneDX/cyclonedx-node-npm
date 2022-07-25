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

import { Command, Option, Argument } from 'commander'
import { Enums, Spec } from '@cyclonedx/cyclonedx-library'

enum OutputFormat {
  JSON = 'JSON',
  XML = 'XML',
}

const OutputStdOut = '-'

const program = new Command(
).summary(
  'Create CycloneDX Software Bill of Materials (SBOM) from Node.js NPM projects.'
).addArgument(
  new Argument(
    '[<package-lock>]',
    'Path to npm lock file.'
  ).default(
    'package-lock.json',
    '"package-lock.json" file in current working directory.'
  )
).addOption(
  new Option(
    '--output-format <OUTPUT-FORMAT>',
    'Which output format to use.'
  ).choices(
    Object.values(OutputFormat)
  ).default(
    // the context is JavaScript - which should prefer JSON
    OutputFormat.JSON
  )
).addOption(
  new Option(
    '--output-file <OUTPUT-FILE>',
    `Path to the output file. Set to "${OutputStdOut}" to write to STDOUT.`
  ).default(
    OutputStdOut,
    'write to STDOUT'
  )
).addOption(
  new Option(
    '--exclude-dev',
    'Exclude dev dependencies.'
  )
).addOption(
  new Option(
    '--spec-version <SPEC-VERSION>',
    'Which version of CycloneDX spec to use.'
  ).choices(
    Object.keys(Spec.SpecVersionDict)
  ).default(
    Spec.Version.v1dot4
  )
).addOption(
  new Option(
    '--mc-type <MC-TYPE>',
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
).parse()

// TODO write the code
console.log('opts:', program.opts())
console.log('args:', program.args)
