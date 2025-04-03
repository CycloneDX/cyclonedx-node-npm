#!/usr/bin/env node

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

/* !!! do not remove/rename this file, it is public CLI in replacement for an API !!! */
require('../dist/cli.js').run(process).catch(e => {
  process.stderr.write(`\n${e}\n`)
  return Math.max(1, Math.floor(Number(e?.code)) || 254)
}).then(exitCode => {
  process.exitCode = exitCode
})
