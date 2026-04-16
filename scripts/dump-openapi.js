/* eslint-disable n/no-process-exit */
'use strict'

/**
 * Boots the FlowFuse app, dumps the live OpenAPI spec to openapi.json, then exits.
 * Does NOT start the HTTP server.
 *
 * Requires the same env config and database as a normal dev run.
 * Usage: node scripts/dump-openapi.js
 */

// Ensure config resolves to the repo root (same as a normal dev run)
process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const fs = require('fs')
const path = require('path')

const forge = require('../forge/forge')

/**
 * @fastify/swagger generates `def-N` keys for component schemas but preserves
 * the original $id as a `title` field. This renames every `def-N` schema key
 * to its `title` value and updates all $ref strings throughout the spec.
 */
function normaliseSchemaNames (spec) {
    const schemas = spec?.components?.schemas
    if (!schemas) return spec

    // Build rename map: { "def-0": "ProvisioningTokenSummary", ... }
    const renameMap = {}
    for (const [key, schema] of Object.entries(schemas)) {
        if (key.startsWith('def-') && schema.title) {
            renameMap[key] = schema.title
        }
    }

    if (Object.keys(renameMap).length === 0) return spec

    // Rename the component schema keys
    const renamedSchemas = {}
    for (const [key, schema] of Object.entries(schemas)) {
        renamedSchemas[renameMap[key] ?? key] = schema
    }
    spec.components.schemas = renamedSchemas

    // Update every $ref in the full spec
    let specStr = JSON.stringify(spec)
    for (const [oldName, newName] of Object.entries(renameMap)) {
        specStr = specStr.replaceAll(
            `"$ref":"#/components/schemas/${oldName}"`,
            `"$ref":"#/components/schemas/${newName}"`
        )
    }

    return JSON.parse(specStr)
}

;(async () => {
    let server
    try {
        // Enterprise-tier dev license so all EE schemas (including MCP, tables) are included.
        const DEV_LICENSE = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZkNDFmNmRjLTBmM2QtNGFmNy1hNzk0LWIyNWFhNGJmYTliZCIsInZlciI6IjIwMjQtMDMtMDQiLCJpc3MiOiJGbG93Rm9yZ2UgSW5jLiIsInN1YiI6IkZsb3dGdXNlIERldmVsb3BtZW50IiwibmJmIjoxNzMwNjc4NDAwLCJleHAiOjIwNzc3NDcyMDAsIm5vdGUiOiJEZXZlbG9wbWVudC1tb2RlIE9ubHkuIE5vdCBmb3IgcHJvZHVjdGlvbiIsInVzZXJzIjoxMCwidGVhbXMiOjEwLCJpbnN0YW5jZXMiOjEwLCJtcXR0Q2xpZW50cyI6NiwidGllciI6ImVudGVycHJpc2UiLCJkZXYiOnRydWUsImlhdCI6MTczMDcyMTEyNH0.02KMRf5kogkpH3HXHVSGprUm0QQFLn21-3QIORhxFgRE9N5DIE8YnTH_f8W_21T6TlYbDUmf4PtWyj120HTM2w'
        server = await forge({ config: { license: DEV_LICENSE, tables: { enabled: true } } })
        const spec = normaliseSchemaNames(server.swagger())
        const outPath = path.resolve(__dirname, '..', 'openapi.json')
        fs.writeFileSync(outPath, JSON.stringify(spec, null, 2))
        console.info(`OpenAPI spec written to ${outPath}`)
    } catch (err) {
        console.error('Failed to generate OpenAPI spec:', err.message || err)
        process.exit(1)
    } finally {
        if (server) {
            await server.close()
        }
        process.exit(0)
    }
})()
