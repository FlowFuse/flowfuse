const should = require('should')
const { default: z } = require('zod')

const { loadToolDefinitions } = require('../../../../../../forge/ee/lib/mcp/toolLoader')

// Invariants that must hold across the whole published tool catalog. These guard the
// class of defect where one tool drifts away from the shared conventions and only shows
// up once an agent is already talking to the registry.
describe('MCP tool catalog', function () {
    const tools = loadToolDefinitions()

    function jsonSchema (tool) {
        return tool.inputSchema ? z.toJSONSchema(z.object(tool.inputSchema)) : { properties: {}, required: [] }
    }

    it('loads every tool definition', function () {
        tools.length.should.be.above(0)
    })

    it('gives every tool a name, title, description, annotations and handler', function () {
        for (const tool of tools) {
            tool.name.should.be.a.String().and.not.be.empty()
            tool.title.should.be.a.String().and.not.be.empty()
            tool.description.should.be.a.String().and.not.be.empty()
            tool.annotations.should.be.an.Object()
            tool.handler.should.be.a.Function()
        }
    })

    it('does not publish the same tool name twice', function () {
        const names = tools.map(tool => tool.name)
        const duplicates = names.filter((name, index) => names.indexOf(name) !== index)
        duplicates.should.eql([])
    })

    it('produces a valid JSON Schema for every input schema', function () {
        for (const tool of tools) {
            should.doesNotThrow(() => jsonSchema(tool), `${tool.name} input schema`)
        }
    })

    it('never marks a parameter as both required and carrying a default', function () {
        // z.toJSONSchema emits exactly this contradiction for `.optional().default(x)`, which
        // forces callers to supply a value the description advertises as optional.
        for (const tool of tools) {
            const schema = jsonSchema(tool)
            for (const name of schema.required || []) {
                should.not.exist(
                    schema.properties[name]?.default,
                    `${tool.name}.${name} is required but declares a default`
                )
            }
        }
    })

    it('keeps pagination parameters optional', function () {
        for (const tool of tools) {
            const required = jsonSchema(tool).required || []
            required.should.not.containEql('limit', `${tool.name} requires limit`)
            required.should.not.containEql('cursor', `${tool.name} requires cursor`)
            required.should.not.containEql('page', `${tool.name} requires page`)
        }
    })
})
