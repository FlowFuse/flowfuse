const SemVer = require('semver')

/**
 * Device Live api routes
 *
 * These are the routes devices use to report/get their status.
 *
 * request.device will be defined for any route defined in here
 *
 * - /api/v1/devices/:deviceId/live/
 *
 * @namespace device
 * @memberof forge.routes.api
 */
module.exports = async function (app) {
    app.addHook('preHandler', (request, reply, done) => {
        // This check ensures the request is being made by a device token
        if (request.session.ownerType !== 'device' || request.session.ownerId !== ('' + request.device.id)) {
            reply.code(401).send({ code: 'unauthorized', error: 'unauthorized' })
        } else {
            done()
        }
    })

    /**
     * POST /api/v1/devices/:deviceId/live/state
     *
     * Devices post to /state at regular intervals. This acts as a heartbeat.
     * The payload should include:
     * {
     *    snapshot: 'xyz'
     * }
     *
     * The response will be a 200 if all is well.
     * If the snapshot doesn't match the target, it will get a 409 (conflict)
     */
    app.post('/state', async (request, reply) => {
        await app.db.controllers.Device.updateState(request.device, request.body)
        if (request.device.isApplicationOwned) {
            if (!request.device.agentVersion || SemVer.lt(request.device.agentVersion, '1.11.0')) {
                reply.code(409).send({
                    error: 'incorrect-agent-version',
                    mode: request.device.mode || null,
                    project: null,
                    settings: null,
                    snapshot: null
                })
                return
            }
        }
        if (Object.hasOwn(request.body, 'project') && request.body.project !== (request.device.Project?.id || null)) {
            reply.code(409).send({
                error: 'incorrect-project',
                project: request.device.Project?.id || null,
                snapshot: request.device.targetSnapshot?.hashid || null,
                settings: request.device.settingsHash || null
            })
            return
        }
        if (Object.hasOwn(request.body, 'application') && request.body.application !== (request.device.Application?.id || null)) {
            reply.code(409).send({
                error: 'incorrect-application',
                application: request.device.Application?.id || null,
                snapshot: request.device.targetSnapshot?.hashid || null,
                settings: request.device.settingsHash || null
            })
            return
        }
        if (request.body.snapshot !== (request.device.targetSnapshot?.hashid || null)) {
            reply.code(409).send({
                error: 'incorrect-snapshot',
                project: request.device.Project?.id || null,
                snapshot: request.device.targetSnapshot?.hashid || null,
                settings: request.device.settingsHash || null
            })
            return
        }
        if (request.body.settings !== undefined && request.body.settings !== (request.device.settingsHash || null)) {
            reply.code(409).send({
                error: 'incorrect-settings',
                project: request.device.Project?.id || null,
                settings: request.device.settingsHash || null,
                snapshot: request.device.targetSnapshot?.hashid || null
            })
            return
        }
        reply.code(200).send({})
    })

    /**
     * GET /api/v1/devices/:deviceId/live/state
     */
    app.get('/state', async (request, reply) => {
        reply.send({
            application: request.device.Application?.id || null,
            project: request.device.Project?.id || null,
            snapshot: request.device.targetSnapshot?.hashid || null,
            settings: request.device.settingsHash || null,
            mode: request.device.mode || null,
            licensed: app.license.active()
        })
    })

    /**
     * GET /api/v1/devices/:deviceId/live/snapshot
     */
    app.get('/snapshot', async (request, reply) => {
        const device = request.device || null
        if (!device.targetSnapshot) {
            // device does not have a target snapshot
            // if this is an application owned device, return a starter snapshot
            if (device.isApplicationOwned) {
                let nodeRedVersion = '3.0.2' // default to older Node-RED
                if (SemVer.satisfies(SemVer.coerce(device.agentVersion), '>=1.11.2')) {
                    // 1.11.2 includes fix for ESM loading of GOT, so lets use 'latest' as before
                    nodeRedVersion = 'latest'
                }
                if (SemVer.satisfies(SemVer.coerce(device.agentVersion), '>=1.11.2')) {
                    // 1.11.2 includes fix for ESM loading of GOT, so lets use 'latest' as before
                    nodeRedVersion = 'latest'
                }
                if (!device.agentVersion || SemVer.lt(device.agentVersion, '1.11.0')) {
                    reply.code(400).send({ code: 'invalid_agent_version', error: 'invalid agent version' })
                    return
                }
                // determine is device is in application mode? if so, return a default snapshot to permit the user to generate flows
                const DEFAULT_APP_SNAPSHOT = {
                    id: '0',
                    name: 'Starter Snapshot',
                    description: 'A starter snapshot for new applications',
                    flows: [
                        { id: 'FFF0000000000001', type: 'tab', label: 'FlowFuse Device Flow', disabled: false, info: '' },
                        { id: 'FFCOM00000000001', type: 'comment', z: 'FFF0000000000001', name: 'Welcome to Node-RED by FlowFuse! \\n This is a basic starter flow for your new device, to get you started.', info: '', x: 310, y: 80 },
                        { id: 'FFINJ00000000001', type: 'inject', z: 'FFF0000000000001', name: 'On Start', props: [{ p: 'payload' }, { p: 'topic', vt: 'str' }], repeat: '', crontab: '', once: true, onceDelay: '0.2', topic: '', payload: 'true', payloadType: 'bool', x: 140, y: 160, wires: [['FFCHA00000000001']] },
                        { id: 'FFCHA00000000001', type: 'change', z: 'FFF0000000000001', name: 'Get Env Vars', rules: [{ t: 'set', p: 'payload', pt: 'msg', to: '{}', tot: 'json' }, { t: 'set', p: 'payload.device', pt: 'msg', to: 'FF_DEVICE_NAME', tot: 'env' }, { t: 'set', p: 'payload.application', pt: 'msg', to: 'FF_APPLICATION_NAME', tot: 'env' }], action: '', reg: false, x: 320, y: 160, wires: [['FFDBG00000000001']] },
                        { id: 'FFDBG00000000001', type: 'debug', z: 'FFF0000000000001', name: 'Info', active: true, tosidebar: true, console: true, tostatus: true, complete: 'payload', targetType: 'msg', statusVal: 'payload', statusType: 'auto', x: 490, y: 160 }
                    ],
                    modules: {
                        'node-red': nodeRedVersion, // TODO: get this from the "somewhere!?!?" - this is where TAGs might work well.
                        // as of FF v1.14.0, we permit project nodes to work on application owned devices
                        // the support for this is in @flowfuse/nr-project-nodes > v0.5.0
                        '@flowfuse/nr-project-nodes': '>0.5.0' // TODO: get this from the "settings" (future)
                    },
                    env: {
                        FF_SNAPSHOT_ID: '0',
                        FF_SNAPSHOT_NAME: 'None',
                        FF_DEVICE_ID: device.hashid,
                        FF_DEVICE_NAME: device.name,
                        FF_DEVICE_TYPE: device.type,
                        FF_APPLICATION_ID: device.Application.hashid,
                        FF_APPLICATION_NAME: device.Application.name
                    }
                }
                return reply.send(DEFAULT_APP_SNAPSHOT)
            }
            reply.send({})
        } else {
            const snapshot = await app.db.models.ProjectSnapshot.byId(device.targetSnapshot.id)
            if (snapshot) {
                // ensure we have a valid settings object
                let settings = snapshot.settings
                if (typeof snapshot.settings === 'string') {
                    try {
                        settings = JSON.parse(snapshot.settings)
                    } catch (_err) {
                        // ignore
                    }
                }
                if (!settings || typeof settings !== 'object') {
                    settings = {}
                }

                // as of FF v1.14.0, we permit project nodes to work on application owned devices
                if (device.isApplicationOwned) {
                    settings.modules = settings.modules || {} // snapshot might not have any modules
                    // @flowfuse/nr-project-nodes > v0.5.0 is required for this to work
                    // if the snapshot does not have the new module specified OR it is a version <= 0.5.0, update it
                    if (!settings.modules['@flowfuse/nr-project-nodes'] || SemVer.satisfies(SemVer.coerce(settings.modules['@flowfuse/nr-project-nodes']), '<=0.5.0')) {
                        settings.modules['@flowfuse/nr-project-nodes'] = '>0.5.0'
                    }
                    // Belt and braces, remove old module! We don't want to be instructing the device to install the old version.
                    // (the old module can be present due to a snapshot applied from an instance or instance owned device)
                    delete settings.modules['@flowforge/nr-project-nodes']
                }

                const result = {
                    id: device.targetSnapshot.hashid,
                    name: snapshot.name,
                    description: snapshot.description,
                    ...settings,
                    ...snapshot.flows
                }

                if (result.credentials) {
                    // Need to re-encrypt these credentials from the source secret
                    // to the target Device secret
                    const secret = snapshot.credentialSecret
                    const deviceSecret = device.credentialSecret
                    result.credentials = app.db.controllers.Project.exportCredentials(result.credentials, secret, deviceSecret)
                }
                reply.send(result)
            } else {
                reply.send({})
            }
        }
    })

    /**
     * GET /api/v1/devices/:deviceId/live/settings
     */
    app.get('/settings', async (request, reply) => {
        const response = {
            hash: request.device.settingsHash,
            env: {}
        }
        const settings = await request.device.getAllSettings()
        Object.keys(settings).forEach(key => {
            if (key === 'env') {
                settings.env.forEach(envVar => {
                    response.env[envVar.name] = envVar.value
                })
            } else {
                response[key] = settings[key]
            }
        })
        const teamType = await request.device.Team.getTeamType()
        response.features = {
            'shared-library': !!(app.config.features.enabled('shared-library') && teamType.getFeatureProperty('shared-library', true)),
            projectComms: !!(app.config.features.enabled('projectComms') && teamType.getFeatureProperty('projectComms', true))
        }
        reply.send(response)
    })
}
