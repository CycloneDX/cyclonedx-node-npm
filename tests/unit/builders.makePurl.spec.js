'use strict'

const { PackageURL } = require('packageurl-js')
const { DummyComponent, BomBuilder } = require('../../dist/builders')

const allQualifiers = {
  vcs_url: 'git+https://github.com/CycloneDX/cyclonedx-npm.git',
  download_url: 'https://registry.npmjs.org/@cyclonedx/cyclonedx-npm/-/cyclonedx-npm-1.0.0.tgz',
  arch: 'i386'
}
const stubPurl = new PackageURL('npm', 'cyclonedx-npm', '@cyclonedx', '1.0.0', allQualifiers)
const stubComponentBuilder = { makeComponent: (_data) => DummyComponent }
const stubPurlFactory = { makeFromComponent: (_component) => stubPurl }
const stubDefaultOptions = { metaComponentType: 'application', includeUrlQualifiers: false }
const stubOptionsIncludingUrlQualifiers = { metaComponentType: 'application', includeUrlQualifiers: true }

describe('builders.makePurl with --include-url-qualifiers command line flag', () => {
  const builderIncludingQualifiers = new BomBuilder(null, stubComponentBuilder, null, stubPurlFactory, stubOptionsIncludingUrlQualifiers)
  test('keeps download_url and vcs_url qualifiers', () => {
    const purl = builderIncludingQualifiers.makePurl(DummyComponent)
    expect(purl.qualifiers).toEqual(allQualifiers)
  })
})

describe('builders.makePurl with default options', () => {
  const builder = new BomBuilder(null, stubComponentBuilder, null, stubPurlFactory, stubDefaultOptions)
  test('drops download_url and vcs_url qualifiers', () => {
    const purl = builder.makePurl(DummyComponent)
    expect(purl.qualifiers).toEqual({ arch: 'i386' })
  })
})
