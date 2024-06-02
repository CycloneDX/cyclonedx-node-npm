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

function noop (): void {
  // do nothing
}

export function makeConsoleLogger (process: NodeJS.Process, level: number): Console {
  // all output shall be bound to stdError - stdOut is for result output only
  const myConsole = new console.Console(process.stderr, process.stderr)

  if (level < 3) {
    myConsole.debug = noop
    if (level < 2) {
      myConsole.info = noop
      if (level < 1) {
        myConsole.log = noop
      }
    }
  }

  return myConsole
}
