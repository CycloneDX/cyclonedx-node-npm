/**
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

import { Enums, Models } from '@cyclonedx/cyclonedx-library'
import * as fs from 'fs'
import * as minimatch from 'minimatch'
import { join } from 'path'

import { PropertyNames } from './properties'

/**
 * Returns the local installation path of the component, which is mentioned in the component
 *
 * @param {Models.Component} component
 * @returns {string} installation path
 */
function getComponentInstallPath (component: Models.Component): string {
  for (const property of component.properties) {
    if (property.name === PropertyNames.PackageInstallPath) {
      return (property.value)
    }
  }
  return ''
}

/**
 * Searches typical files in the package path which have typical a license text inside
 *
 * @param {string} pkgPath
 * @param {string} licenseName
 * @returns {Map<string, string>} filepath as key and guessed content type as value
 */
function searchLicenseSources (pkgPath: string, licenseName: string): Map<string, string> {
  const licenseFilenamesWType = new Map<string, string>()
  if (pkgPath.length < 1) {
    return licenseFilenamesWType
  }
  const typicalFilenames = ['license', 'licence', 'notice', 'unlicense', 'unlicence']
  const licenseContentTypes = { 'text/plain': '', 'text/txt': '.txt', 'text/markdown': '.md', 'text/xml': '.xml' }
  const potentialFilenames = fs.readdirSync(pkgPath)
  for (const typicalFilename of typicalFilenames) {
    for (const filenameVariant of [typicalFilename, typicalFilename + '.' + licenseName, typicalFilename + '-' + licenseName]) {
      for (const [licenseContentType, fileExtension] of Object.entries(licenseContentTypes)) {
        for (const filename of minimatch.match(potentialFilenames, filenameVariant + fileExtension, { nocase: true, noglobstar: true, noext: true })) {
          licenseFilenamesWType.set(join(pkgPath, filename), licenseContentType)
        }
      }
    }
  }
  return licenseFilenamesWType
}

/**
 * Adds the content of a guessed license file to the license as license text in base 64 format
 *
 * @param {Models.DisjunctiveLicense} license
 * @param {string} installPath
 */
function addLicTextBasedOnLicenseFiles (license: Models.DisjunctiveLicense, installPath: string): void {
  const licenseFilenamesWType = searchLicenseSources(installPath, '')
  for (const [licenseFilename, licenseContentType] of licenseFilenamesWType) {
    const licContent = fs.readFileSync(licenseFilename, { encoding: 'base64' })
    license.text = new Models.Attachment(licContent, {
      encoding: Enums.AttachmentEncoding.Base64,
      contentType: licenseContentType
    })
  }
}

/**
 * Add license texts to the license parts of the component
*
* @param {projectDir} string
* @param {Models.Component} component
*/
function addLicenseTextToComponent (projectDir: string, component: Models.Component): void {
  if (component.licenses.size === 1) {
    const license = component.licenses.values().next().value
    if (license instanceof Models.NamedLicense || license instanceof Models.SpdxLicense) {
      addLicTextBasedOnLicenseFiles(license, join(projectDir, getComponentInstallPath(component)))
    }
  }
}

/**
 * Go through component tree and add license texts
 *
 * @param {projectDir} string
 * @param {Models.ComponentRepository} components
 */
function addLicenseTextsToComponents (projectDir: string, components: Models.ComponentRepository): void {
  for (const component of components) {
    addLicenseTextToComponent(projectDir, component)
    // Handle sub components
    addLicenseTextsToComponents(projectDir, component.components)
  }
}

/**
 * Entry function to add license texts to the components in the SBoM
 *
 * @export
 * @param {projectDir} string
 * @param {Models.Bom} bom
 */
export function addLicenseTextsToBom (projectDir: string, bom: Models.Bom): void {
  addLicenseTextsToComponents(projectDir, bom.components)
}
