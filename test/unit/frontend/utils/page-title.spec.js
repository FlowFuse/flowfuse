import { describe, expect, test } from 'vitest'

import { computePageTitle, isEditorRoute } from '../../../../frontend/src/utils/page-title.ts'

function makeRoute ({ name, id, title }) {
    return {
        name,
        params: id == null ? {} : { id },
        matched: title == null ? [] : [{ meta: { title } }]
    }
}

describe('isEditorRoute', () => {
    test('matches instance-editor and device-editor route names', () => {
        expect(isEditorRoute({ name: 'instance-editor' })).toBe(true)
        expect(isEditorRoute({ name: 'instance-editor-sub-flow' })).toBe(true)
        expect(isEditorRoute({ name: 'device-editor' })).toBe(true)
    })

    test('returns false for non-editor and null routes', () => {
        expect(isEditorRoute({ name: 'instance-overview' })).toBe(false)
        expect(isEditorRoute({ name: 'device-overview' })).toBe(false)
        expect(isEditorRoute({ name: 'Home' })).toBe(false)
        expect(isEditorRoute(null)).toBe(false)
        expect(isEditorRoute(undefined)).toBe(false)
        expect(isEditorRoute({})).toBe(false)
    })
})

describe('computePageTitle', () => {
    test('returns null when no matched route has a meta.title', () => {
        expect(computePageTitle(makeRoute({ name: 'instance-overview', id: 'abc' }), {})).toBe(null)
        expect(computePageTitle(null, {})).toBe(null)
        expect(computePageTitle(undefined, { instance: { id: 'abc', name: 'X' } })).toBe(null)
    })

    test('falls through to static title with FlowFuse suffix when no context match', () => {
        const route = makeRoute({ name: 'Home', title: 'Home' })
        expect(computePageTitle(route, {})).toBe('Home - FlowFuse')
    })

    test('substitutes instance name on instance-* routes when id matches', () => {
        const route = makeRoute({ name: 'instance-overview', id: 'abc', title: 'Instance - Overview' })
        const context = { instance: { id: 'abc', name: 'MyInstance' } }
        expect(computePageTitle(route, context)).toBe('MyInstance - Overview - FlowFuse')
    })

    test('substitutes device name on device-* routes when id matches', () => {
        const route = makeRoute({ name: 'device-logs', id: 'dev-1', title: 'Device - Logs' })
        const context = { device: { id: 'dev-1', name: 'RaspberryPi-Edge' } }
        expect(computePageTitle(route, context)).toBe('RaspberryPi-Edge - Logs - FlowFuse')
    })

    test('falls back to static title when instance id does not match route id (stale store during nav A -> B)', () => {
        const route = makeRoute({ name: 'instance-overview', id: 'B', title: 'Instance - Overview' })
        const context = { instance: { id: 'A', name: 'OldInstance' } }
        expect(computePageTitle(route, context)).toBe('Instance - Overview - FlowFuse')
    })

    test('falls back to static title when context instance is null / has no name', () => {
        const route = makeRoute({ name: 'instance-overview', id: 'abc', title: 'Instance - Overview' })
        expect(computePageTitle(route, {})).toBe('Instance - Overview - FlowFuse')
        expect(computePageTitle(route, { instance: null })).toBe('Instance - Overview - FlowFuse')
        expect(computePageTitle(route, { instance: { id: 'abc' } })).toBe('Instance - Overview - FlowFuse')
    })

    test('does not substitute on cross-family mismatch (device on instance route, etc.)', () => {
        const instanceRoute = makeRoute({ name: 'instance-overview', id: 'abc', title: 'Instance - Overview' })
        const deviceRoute = makeRoute({ name: 'device-overview', id: 'abc', title: 'Device - Overview' })
        expect(computePageTitle(instanceRoute, { device: { id: 'abc', name: 'D' } })).toBe('Instance - Overview - FlowFuse')
        expect(computePageTitle(deviceRoute, { instance: { id: 'abc', name: 'I' } })).toBe('Device - Overview - FlowFuse')
    })

    test('leaves titles untouched when they do not start with Instance / Device', () => {
        // Defensive guard: e.g. 'Application Settings - General' on an application route should be unchanged.
        const route = makeRoute({ name: 'application-settings-general', id: 'abc', title: 'Application Settings - General' })
        expect(computePageTitle(route, { instance: { id: 'abc', name: 'X' } })).toBe('Application Settings - General - FlowFuse')
    })

    test('requires a word boundary after the Instance / Device prefix', () => {
        // 'Instances - Foo' must NOT be treated as 'Instance' + 's - Foo' — only whole-word prefix substitutes.
        const instancesRoute = makeRoute({ name: 'instance-devices', id: 'abc', title: 'Instances - Foo' })
        expect(computePageTitle(instancesRoute, { instance: { id: 'abc', name: 'X' } })).toBe('Instances - Foo - FlowFuse')

        const devicesRoute = makeRoute({ name: 'device-overview', id: 'abc', title: 'Devices - Foo' })
        expect(computePageTitle(devicesRoute, { device: { id: 'abc', name: 'X' } })).toBe('Devices - Foo - FlowFuse')
    })

    test('substitutes when the title is exactly Instance / Device with no suffix', () => {
        const instRoute = makeRoute({ name: 'instance-overview', id: 'abc', title: 'Instance' })
        expect(computePageTitle(instRoute, { instance: { id: 'abc', name: 'Prod' } })).toBe('Prod - FlowFuse')

        const devRoute = makeRoute({ name: 'device-overview', id: 'abc', title: 'Device' })
        expect(computePageTitle(devRoute, { device: { id: 'abc', name: 'Pi' } })).toBe('Pi - FlowFuse')
    })

    test('substitutes name on editor routes too (e.g. instance-editor with title "Instance - Editor")', () => {
        // routes.js sets an initial title for editor pages; the Node-RED workspace:change handler overwrites it later.
        const route = makeRoute({ name: 'instance-editor', id: 'abc', title: 'Instance - Editor' })
        const context = { instance: { id: 'abc', name: 'Prod' } }
        expect(computePageTitle(route, context)).toBe('Prod - Editor - FlowFuse')
    })

    test('preserves whatever follows the Instance/Device prefix verbatim', () => {
        const route = makeRoute({ name: 'instance-devices', id: 'abc', title: 'Instance - Remote Instances' })
        const context = { instance: { id: 'abc', name: 'Prod' } }
        expect(computePageTitle(route, context)).toBe('Prod - Remote Instances - FlowFuse')
    })

    test('picks the deepest matched route with a meta.title (parent / child nesting)', () => {
        const route = {
            name: 'instance-overview',
            params: { id: 'abc' },
            matched: [
                { meta: { title: 'Parent' } },
                { meta: { title: 'Instance - Overview' } }
            ]
        }
        const context = { instance: { id: 'abc', name: 'MyInstance' } }
        expect(computePageTitle(route, context)).toBe('MyInstance - Overview - FlowFuse')
    })
})
