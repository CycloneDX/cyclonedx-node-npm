'use strict'

const { PackageURL } = require('packageurl-js')
const { DummyComponent, BomBuilder } = require('../../dist/builders')

const urlQualifiers = {
  vcs_url: 'git+https://github.com/CycloneDX/cyclonedx-npm.git',
  download_url: 'https://registry.npmjs.org/@cyclonedx/cyclonedx-npm/-/cyclonedx-npm-1.0.0.tgz'
}
const mockPurl = new PackageURL('npm', 'cyclonedx-npm', '@cyclonedx', '1.0.0', urlQualifiers)
const mockComponentBuilder = { makeComponent: jest.fn().mockReturnValue(DummyComponent) }
const mockPurlFactory = { makeFromComponent: jest.fn().mockReturnValue(mockPurl) }
const mockDefaultOptions = { metaComponentType: 'application' }

describe('builders.makePurl with default options', () => {
  const builder = new BomBuilder({}, mockComponentBuilder, {}, mockPurlFactory, mockDefaultOptions)
  test('makePurl drops download_url and vcs_url qualifiers', () => {
    const purl = builder.makePurl(DummyComponent)
    expect(purl.qualifiers).toBeUndefined()
  })
})
