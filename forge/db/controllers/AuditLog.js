const { requestContext } = require('@fastify/request-context')

function encodeBody (body) {
    if (body !== undefined) {
        const result = JSON.stringify(body)
        if (result !== '{}') {
            return result
        }
    }
}

function getSourceContext () {
    const ctx = requestContext.get('sourceContext')
    if (!ctx) {
        return { source: null, sourceContext: undefined }
    }
    const sc = {}
    if (ctx.tokenId != null) { sc.tokenId = ctx.tokenId }
    if (ctx.toolName) { sc.toolName = ctx.toolName }
    if (ctx.correlationId) { sc.correlationId = ctx.correlationId }
    return {
        source: ctx.source ?? null,
        sourceContext: Object.keys(sc).length > 0 ? sc : undefined
    }
}

function applySourceContext (body) {
    const { source, sourceContext } = getSourceContext()
    if (sourceContext) {
        body = body || {}
        body.sourceContext = sourceContext
    }
    return { source, body }
}

function addToLog (app, entityType, entityId, event, body) {
    const details = [`event: ${event}`]
    if (entityType) { details.push(`type: ${entityType}`) }
    if (entityId) { details.push(`id: ${entityId}`) }
    if (event === 'context.delete' && body && typeof body === 'object' && body.key && body.scope && body.store) {
        details.push(`key: ${body.key}`)
        details.push(`scope: ${body.scope}`)
        details.push(`store: ${body.store}`)
    }
    const msg = details.join(', ')
    if (body && body.error) {
        app.log.error(`AUDIT: ${msg}, ${body.error.message || 'unknown error'}`)
    } else {
        app.log.info(`AUDIT: ${msg}`)
    }
}

module.exports = {
    platformLog: async function (app, UserId, event, body) {
        const { source, body: enrichedBody } = applySourceContext(body)
        await app.db.models.AuditLog.create({
            entityType: 'platform',
            entityId: null,
            UserId,
            event,
            source,
            body: encodeBody(enrichedBody)
        })
        addToLog(app, 'platform', null, event, enrichedBody)
    },
    userLog: async function (app, UserId, event, body, entityId) {
        const { source, body: enrichedBody } = applySourceContext(body)
        await app.db.models.AuditLog.create({
            entityType: 'user',
            entityId: entityId || null,
            UserId,
            event,
            source,
            body: encodeBody(enrichedBody)
        })
        addToLog(app, 'user', entityId, event, enrichedBody)
    },
    applicationLog: async function (app, ApplicationId, UserId, event, body) {
        const { source, body: enrichedBody } = applySourceContext(body)
        await app.db.models.AuditLog.create({
            entityType: 'application',
            entityId: ApplicationId,
            UserId,
            event,
            source,
            body: encodeBody(enrichedBody)
        })
        addToLog(app, 'application', ApplicationId, event, enrichedBody)
    },
    projectLog: async function (app, ProjectId, UserId, event, body) {
        const { source, body: enrichedBody } = applySourceContext(body)
        await app.db.models.AuditLog.create({
            entityType: 'project',
            entityId: ProjectId,
            UserId,
            event,
            source,
            body: encodeBody(enrichedBody)
        })
        addToLog(app, 'project', ProjectId, event, enrichedBody)
    },
    teamLog: async function (app, TeamId, UserId, event, body) {
        const { source, body: enrichedBody } = applySourceContext(body)
        await app.db.models.AuditLog.create({
            entityType: 'team',
            entityId: TeamId,
            UserId,
            event,
            source,
            body: encodeBody(enrichedBody)
        })
        addToLog(app, 'team', TeamId, event, enrichedBody)
    },
    deviceLog: async function (app, DeviceId, UserId, event, body) {
        const { source, body: enrichedBody } = applySourceContext(body)
        await app.db.models.AuditLog.create({
            entityType: 'device',
            entityId: DeviceId,
            UserId,
            event,
            source,
            body: encodeBody(enrichedBody)
        })
    }
}
