/* eslint-env jest */

import path from 'path'
import {
  exists,
  remove,
  readFile,
  readJSON,
  writeJSON,
  createFile,
} from 'fs-extra'

import { launchApp, findPort, killApp, renderViaHTTP } from 'next-test-utils'

jest.setTimeout(1000 * 60 * 5)

describe('Fork ts checker plugin', () => {
  const appDir = path.join(__dirname, '../')
  const tsConfig = path.join(appDir, 'tsconfig.json')
  let appPort
  let app

  beforeAll(async () => {
    appPort = await findPort()
    app = await launchApp(appDir, appPort)
  })

  afterAll(async () => {
    await killApp(app)
    await remove(tsConfig)
  })

  it('Creates a default tsconfig.json when one is missing', async () => {
    expect(await exists(tsConfig)).toBe(true)

    const tsConfigContent = await readFile(tsConfig)
    let parsedTsConfig
    expect(() => {
      parsedTsConfig = JSON.parse(tsConfigContent)
    }).not.toThrow()

    expect(parsedTsConfig.exclude[0]).toBe('node_modules')
  })

  it('Works with an empty tsconfig.json (docs)', async () => {
    await killApp(app)

    await remove(tsConfig)
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(await exists(tsConfig)).toBe(false)

    await createFile(tsConfig)
    await new Promise(resolve => setTimeout(resolve, 500))

    expect(await readFile(tsConfig, 'utf8')).toBe('')

    await killApp(app)
    await new Promise(resolve => setTimeout(resolve, 500))

    appPort = await findPort()
    app = await launchApp(appDir, appPort)

    const tsConfigContent = await readFile(tsConfig)
    let parsedTsConfig
    expect(() => {
      parsedTsConfig = JSON.parse(tsConfigContent)
    }).not.toThrow()

    expect(parsedTsConfig.exclude[0]).toBe('node_modules')
  })

  it('Updates an existing tsconfig.json with required value', async () => {
    await killApp(app)

    let parsedTsConfig = await readJSON(tsConfig)
    parsedTsConfig.compilerOptions.esModuleInterop = false

    await writeJSON(tsConfig, parsedTsConfig)
    appPort = await findPort()
    app = await launchApp(appDir, appPort)

    parsedTsConfig = await readJSON(tsConfig)
    expect(parsedTsConfig.compilerOptions.esModuleInterop).toBe(true)
  })

  it('Renders a TypeScript page correctly', async () => {
    const html = await renderViaHTTP(appPort, '/')
    expect(html).toMatch(/Hello TypeScript/)
  })
})
