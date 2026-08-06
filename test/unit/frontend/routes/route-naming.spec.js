import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

import { describe, expect, test } from 'vitest'

const KEBAB_CASE_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/
const ROUTE_NAME_PATTERN = /name:\s*['"]([^'"]+)['"]/g

const FRONTEND_SRC = join(__dirname, '../../../../frontend/src')

function findRouteFiles (dir) {
    const files = []
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry)
        if (entry === 'node_modules') continue
        if (statSync(full).isDirectory()) {
            files.push(...findRouteFiles(full))
        } else if (entry === 'routes.js') {
            files.push(full)
        }
    }
    return files
}

function extractRouteNames (filePath) {
    const content = readFileSync(filePath, 'utf-8')
    const names = []
    let match
    while ((match = ROUTE_NAME_PATTERN.exec(content)) !== null) {
        names.push({ name: match[1], file: filePath.replace(FRONTEND_SRC + '/', '') })
    }
    return names
}

describe('route naming conventions', () => {
    const routeFiles = findRouteFiles(FRONTEND_SRC)
    const allNames = routeFiles.flatMap(extractRouteNames)

    test('found route files to validate', () => {
        expect(routeFiles.length).toBeGreaterThan(0)
        expect(allNames.length).toBeGreaterThan(0)
    })

    test('all route names follow kebab-case convention', () => {
        const violations = allNames.filter(({ name }) => !KEBAB_CASE_PATTERN.test(name))
        const report = violations.map(({ name, file }) => `  ${name} (${file})`).join('\n')
        expect(violations, `Non-kebab-case route names found:\n${report}`).toEqual([])
    })
})
