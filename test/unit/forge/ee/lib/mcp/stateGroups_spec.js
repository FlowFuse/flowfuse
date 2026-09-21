const fs = require('fs')
const path = require('path')

const should = require('should') // eslint-disable-line no-unused-vars

const ROOT = path.join(__dirname, '../../../../../..')

// STATE_GROUPS in the MCP instances tools is a hand-copy of the frontend's InstanceStates
// groups, because forge (CommonJS) cannot require the frontend's ESM composable. A copy with
// no guard drifts silently, and the failure mode is quiet: platform_list_hosted_instances
// would filter on a different set of states than the dashboard's own Running/Error/Not Running
// filter, while still claiming in its description to match it. This test is that guard.
function parseArray (source, name) {
    const match = source.match(new RegExp(`${name}\\s*=\\s*\\[([^\\]]*)\\]`))
    should.exist(match, `expected to find ${name}`)
    return match[1]
        .split(',')
        .map(entry => entry.replace(/\/\/.*$/, '').trim().replace(/^'|'$/g, ''))
        .filter(Boolean)
}

describe('MCP instance state groups', function () {
    const frontend = fs.readFileSync(path.join(ROOT, 'frontend/src/composables/InstanceStates.js'), 'utf8')
    const toolsSource = fs.readFileSync(path.join(ROOT, 'forge/ee/lib/mcp/tools/instances.js'), 'utf8')

    const groupsBlock = toolsSource.match(/const STATE_GROUPS = \{([\s\S]*?)\n\}/)
    const mcpGroups = {}
    for (const line of groupsBlock[1].split('\n')) {
        const match = line.match(/(\w+):\s*\[(.*)\]/)
        if (match) {
            mcpGroups[match[1]] = match[2].split(',').map(s => s.trim().replace(/^'|'$/g, '')).filter(Boolean)
        }
    }

    const pairs = [
        ['running', 'runningStates'],
        ['error', 'errorStates'],
        ['notRunning', 'stoppedStates']
    ]

    pairs.forEach(([mcpKey, frontendKey]) => {
        it(`keeps the ${mcpKey} group in step with the frontend's ${frontendKey}`, function () {
            const expected = parseArray(frontend, frontendKey)
            // Order is irrelevant - these are membership sets used to build a filter.
            mcpGroups[mcpKey].slice().sort().should.eql(expected.slice().sort())
        })
    })

    it('covers every frontend group, so a newly added group cannot be missed', function () {
        Object.keys(mcpGroups).sort().should.eql(pairs.map(([mcpKey]) => mcpKey).sort())
    })
})
