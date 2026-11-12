import { expect, test } from 'bun:test'
import { cp, mkdtemp, rm, readFile, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

test.concurrent('viewer CLI validates its bundle rather than starting setup', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'groma-viewer-cli-'))
  try {
    const child = Bun.spawn([process.execPath, path.resolve(import.meta.dir, '../src/cli.ts'), '--viewer', root, '--port', '0'], { stdout: 'pipe', stderr: 'pipe' })
    const stderr = await new Response(child.stderr).text()
    expect(await child.exited).toBe(1)
    expect(stderr.includes("unknown option")).toBe(false)
    expect(stderr).toMatch(/index.md|project.md/)
  } finally { await rm(root, { recursive: true, force: true }) }
})


test.concurrent('bundle reads are lock-free and its write methods refuse changes', async () => {
  const { GromaFileSystem } = await import('../src/groma-filesystem.ts')
  const root = await mkdtemp(path.join(os.tmpdir(), 'groma-viewer-read-'))
  try {
    await writeFile(path.join(root, 'index.md'), 'original')
    await writeFile(path.join(root, '.groma.lock'), 'external lock')
    const filesystem = GromaFileSystem.openBundle(root)
    expect(await filesystem.read('index.md')).toBe('original')
    await expect(filesystem.write('index.md', 'changed')).rejects.toThrow('read-only')
    expect(await readFile(path.join(root, 'index.md'), 'utf8')).toBe('original')
  } finally { await rm(root, { recursive: true, force: true }) }
})

test.concurrent('viewer catches Markdown changes during initial map loading', async () => {
  const { createWebMapSession } = await import('../src/viewers/web/map-session.ts')
  const root = await mkdtemp(path.join(os.tmpdir(), 'groma-viewer-start-'))
  let session: Awaited<ReturnType<typeof createWebMapSession>> | undefined
  try {
    await cp(path.resolve(import.meta.dir, '../test/fixtures/flows/groma'), root, { recursive: true })
    let changed = false
    session = await createWebMapSession(root, { markdownOnly: true, onProgress: async progress => {
      if (progress.phase === 'preparing-map' && !changed) {
        changed = true
        const file = path.join(root, 'project.md')
        const source = await readFile(file, 'utf8')
        await writeFile(file, source.replace(/^title:.*$/m, 'title: Updated during startup'))
        await Bun.sleep(350) // Deliver the filesystem event while the initial load is still running.
      }
    } })
    let title = ''
    const deadline = Date.now() + 3000
    while (Date.now() < deadline) {
      const response = await session.fetch(new Request('http://localhost/world.json'))
      title = (await response.json()).project.title
      if (title === 'Updated during startup') break
      await Bun.sleep(20)
    }
    expect(title).toBe('Updated during startup')
  } finally { await session?.close(); await rm(root, { recursive: true, force: true }) }
})


test.concurrent('viewer keeps the last good map and reports a failed Markdown update', async () => {
  const { createWebMapSession } = await import('../src/viewers/web/map-session.ts')
  const root = await mkdtemp(path.join(os.tmpdir(), 'groma-viewer-update-'))
  let session: Awaited<ReturnType<typeof createWebMapSession>> | undefined
  try {
    await cp(path.resolve(import.meta.dir, '../test/fixtures/flows/groma'), root, { recursive: true })
    session = await createWebMapSession(root, { markdownOnly: true })
    const world = async () => (await (await session!.fetch(new Request('http://localhost/world.json'))).json())
    const original = await world()
    const file = path.join(root, 'project.md')
    const source = await readFile(file, 'utf8')
    await writeFile(file, '---\ntype: broken\n---\nInvalid')
    let current = await world()
    const deadline = Date.now() + 2500
    while (!current.viewerError && Date.now() < deadline) { await Bun.sleep(20); current = await world() }
    expect(current.viewerError).toBeString()
    expect(current.project.title).toBe(original.project.title)
    await writeFile(file, source.replace(/^title:.*$/m, 'title: Recovered map'))
    const recoveredBy = Date.now() + 2500
    while (current.project.title !== 'Recovered map' && Date.now() < recoveredBy) { await Bun.sleep(20); current = await world() }
    expect(current.project.title).toBe('Recovered map')
    expect(current.viewerError).toBeUndefined()
  } finally { await session?.close(); await rm(root, { recursive: true, force: true }) }
})


test.concurrent('Markdown source control cannot open or request source even from a shared file link', async () => {
  const { createSourceControl } = await import('../src/viewers/web/source/control.ts')
  const { loadArchitecture } = await import('../src/architecture-reader.ts')
  const { annotateArchitecture } = await import('../src/core.ts')
  const world = annotateArchitecture(await loadArchitecture(path.resolve(import.meta.dir, '../test/fixtures/flows')))
  const element = world.elements.find(item => item.kind === 'component')!
  element.code = [{ file: 'src/private.ts', scanner: 'fixture' }]
  let codeRequests = 0
  let sourceRequests = 0
  const control = createSourceControl({
    available: false, host: {} as HTMLElement, initialFile: 'src/private.ts',
    element: () => element, revision: () => undefined,
    readCode: async () => { codeRequests++; return [] },
    readSource: async () => { sourceRequests++; throw new Error('must not request source') },
    repaint() { throw new Error('must not open source') },
  })
  expect(control.file).toBeUndefined()
  control.open('src/private.ts')
  expect(control.file).toBeUndefined()
  expect(control.code()).toEqual([])
  await Promise.resolve()
  expect(codeRequests).toBe(0)
  expect(sourceRequests).toBe(0)
})
