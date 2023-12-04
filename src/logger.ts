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

import { stderr } from 'node:process'

import { type BaseLogger, type Level, type LevelWithSilent, pino } from 'pino'

const logLevels: Level[] = ['debug', 'error', 'fatal', 'warn', 'info', 'trace'] as const
export const verbosityLevels: LevelWithSilent[] = [...logLevels, 'silent'] as const

// all output shall be bound to stdError - stdOut is for result output only
const streams = logLevels.map((level) => ({ level, stream: stderr }))

export type Logger = BaseLogger
export type VerbosityLevel = LevelWithSilent

export const createLogger = (verbosityLevel: VerbosityLevel): Logger => pino({
  name: 'cyclonedx-node-npm',
  level: verbosityLevel,
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,name,hostname'
    }
  }
}, pino.multistream(streams))
