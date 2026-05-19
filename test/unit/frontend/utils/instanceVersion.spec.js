import { describe, expect, test } from 'vitest'

import { isInstanceOnNR5Plus } from '../../../../frontend/src/utils/instanceVersion.ts'

describe('isInstanceOnNR5Plus', () => {
    test('returns false for null / undefined / empty objects', () => {
        expect(isInstanceOnNR5Plus(null)).toBe(false)
        expect(isInstanceOnNR5Plus(undefined)).toBe(false)
        expect(isInstanceOnNR5Plus({})).toBe(false)
        expect(isInstanceOnNR5Plus({ meta: {} })).toBe(false)
        expect(isInstanceOnNR5Plus({ meta: { versions: {} } })).toBe(false)
    })

    test('returns false when the reported NR version is below 5', () => {
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '4.1.8' } } })).toBe(false)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '3.1.0' } } })).toBe(false)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '4.99.99' } } })).toBe(false)
    })

    test('returns true for NR 5.x stable releases', () => {
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '5.0.0' } } })).toBe(true)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '5.1.0' } } })).toBe(true)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '5.10.5' } } })).toBe(true)
    })

    test('returns true for NR 5.x prereleases (SemVer.coerce strips the tag)', () => {
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '5.0.0-beta.6' } } })).toBe(true)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '5.0.0-rc.1' } } })).toBe(true)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '5.0.0-alpha.0' } } })).toBe(true)
    })

    test('returns true for future major versions', () => {
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '6.0.0' } } })).toBe(true)
        expect(isInstanceOnNR5Plus({ meta: { versions: { 'node-red': '10.2.3' } } })).toBe(true)
    })

    test('reads the device shape (top-level nodeRedVersion)', () => {
        expect(isInstanceOnNR5Plus({ nodeRedVersion: '5.0.0-beta.6' })).toBe(true)
        expect(isInstanceOnNR5Plus({ nodeRedVersion: '4.1.8' })).toBe(false)
        expect(isInstanceOnNR5Plus({ nodeRedVersion: null })).toBe(false)
        expect(isInstanceOnNR5Plus({ nodeRedVersion: '' })).toBe(false)
    })

    test('prefers instance shape over device shape when both are present', () => {
        // Edge case: an object that has both fields. instance.meta.versions wins.
        expect(isInstanceOnNR5Plus({
            meta: { versions: { 'node-red': '5.0.0' } },
            nodeRedVersion: '4.1.8'
        })).toBe(true)
        expect(isInstanceOnNR5Plus({
            meta: { versions: { 'node-red': '4.1.8' } },
            nodeRedVersion: '5.0.0'
        })).toBe(false)
    })
})
