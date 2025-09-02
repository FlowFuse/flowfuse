const SemVer = require('semver')

const { exportEnvVarObject, mapEnvObjectToArray, mapEnvArrayToObject } = require('../../db/utils')
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
        const isProvisioning = request.device.isApplicationOwned && request.body.provisioning?.deviceConfig && request.body.state === 'provisioning'
        await app.db.controllers.Device.updateState(request.device, request.body)
        if (request.device.isApplicationOwned) {
            const device = request.device
            if (isProvisioning) {
                // If the device is in provisioning mode, set the target snapshot to the init snapshot
                // generate a new snapshot for this device
                const user = request.session?.User || { id: null }
                try {
                    const provisionedSnapshotOptions = {
                        name: request.body.provisioning.name || 'Imported snapshot',
                        description: request.body.provisioning.description || 'Snapshot imported during provisioning at ' + new Date().toISOString(),
                        setAsTarget: true,
                        credentialSecret: request.body.provisioning.credentialSecret || undefined,
                        deviceConfig: request.body.provisioning.deviceConfig
                    }
                    const snapShot = await app.db.controllers.ProjectSnapshot.createDeviceSnapshot(
                        device.Application,
                        device,
                        { id: null }, // state is transmitted from the device, so we don't have a user id
                        provisionedSnapshotOptions
                    )
                    device.set('targetSnapshotId', snapShot.id)
                    await device.save()

                    // audit log the creation of the snapshot
                    await app.auditLog.Application.application.device.snapshot.created(user, null, device.Application, device, snapShot)
                    await app.auditLog.Device.device.snapshot.created(user, null, device, snapShot)
                    await app.auditLog.Device.device.snapshot.targetSet(user, null, device, snapShot)
                } catch (err) {
                    await app.auditLog.Application.application.device.snapshot.created(user, err, device.Application, device, null)
                    await app.auditLog.Device.device.snapshot.created(user, err, device, null)
                } finally {
                    await app.db.controllers.Device.updateState(request.device, { state: 'offline' }) // Now set the state to offline if we fail to create the snapshot
                }
            }

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
        // if provisioning, don't check the snapshot
        if (!isProvisioning) {
            if (request.body.snapshot !== (request.device.targetSnapshot?.hashid || null)) {
                reply.code(409).send({
                    error: 'incorrect-snapshot',
                    project: request.device.Project?.id || null,
                    snapshot: request.device.targetSnapshot?.hashid || null,
                    settings: request.device.settingsHash || null
                })
                return
            }
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
        const applyOverrides = async (dev, obj) => {
            // if device has a user specified node-red version, update or inject that in the snapshot
            const editor = await dev.getSetting('editor')
            if (editor?.nodeRedVersion && SemVer.valid(editor?.nodeRedVersion)) {
                obj.modules = obj.modules || {}
                obj.modules['node-red'] = editor?.nodeRedVersion
            }
        }
        if (!device.targetSnapshot) {
            // device does not have a target snapshot
            // if this is an application owned device, return a starter snapshot
            if (device.isApplicationOwned) {
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
                    modules: device.getDefaultModules(),
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
                await applyOverrides(device, DEFAULT_APP_SNAPSHOT)
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
                    const defaultModules = device.getDefaultModules()
                    settings.modules = settings.modules || defaultModules // snapshot might not have any modules
                    // @flowfuse/nr-project-nodes > v0.5.0 is required for this to work
                    // if the snapshot does not have the new module specified OR it is a version <= 0.5.0, update it
                    if (!settings.modules['@flowfuse/nr-project-nodes'] || SemVer.satisfies(SemVer.coerce(settings.modules['@flowfuse/nr-project-nodes']), '<=0.5.0')) {
                        settings.modules['@flowfuse/nr-project-nodes'] = defaultModules['@flowfuse/nr-project-nodes'] || '>0.5.0'
                    }
                    if (!settings.modules['@flowfuse/nr-mqtt-nodes']) {
                        settings.modules['@flowfuse/nr-mqtt-nodes'] = defaultModules['@flowfuse/nr-mqtt-nodes'] || '>0.1.0'
                    }
                    if (!settings.modules['@flowfuse/nr-tables-nodes']) {
                        settings.modules['@flowfuse/nr-tables-nodes'] = defaultModules['@flowfuse/nr-tables-nodes'] || '>0.1.0'
                    }
                    if (!settings.modules['@flowfuse/nr-assistant']) {
                        settings.modules['@flowfuse/nr-assistant'] = defaultModules['@flowfuse/nr-assistant'] || '>=0.1.0'
                    }
                    if (!settings.modules['node-red']) {
                        // if the snapshot does not have the node-red module specified, ensure it is set to a valid version
                        settings.modules['node-red'] = defaultModules['node-red'] || device.getDefaultNodeRedVersion()
                    }
                    // Belt and braces, remove old module! We don't want to be instructing the device to install the old version.
                    // (the old module can be present due to a snapshot applied from an instance or instance owned device)
                    delete settings.modules['@flowforge/nr-project-nodes']
                    await applyOverrides(device, settings)
                }

                // ensure the snapshot has the correct FF_ environment variables
                try {
                    // since transmit env in key/value pairs for a snapshot, we need to convert them to the same
                    // format as we store them in the database, then we can update the FF_ env vars before
                    // re-converting to key/value pairs ready for the snapshot
                    const envArray = mapEnvObjectToArray(settings.env || {})
                    const updatedEnv = app.db.controllers.Device.insertPlatformSpecificEnvVars(device, envArray)
                    // Convert back to the exported key/value pair with any hidden values inserted
                    settings.env = exportEnvVarObject(mapEnvArrayToObject(updatedEnv))
                } catch (err) {
                    app.log.error('Failed to update environment variables in snapshot', err)
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
        const settings = await request.device.getAllSettings({
            mergeDeviceGroupSettings: true
        })
        Object.keys(settings).forEach(key => {
            if (key === 'env') {
                response.env = exportEnvVarObject(mapEnvArrayToObject(settings.env || []))
            } else {
                response[key] = settings[key]
            }
        })
        const teamType = await request.device.Team.getTeamType()
        response.features = {
            'shared-library': !!(app.config.features.enabled('shared-library') && teamType.getFeatureProperty('shared-library', true)),
            projectComms: !!(app.config.features.enabled('projectComms') && teamType.getFeatureProperty('projectComms', true)),
            teamBroker: !!(app.config.features.enabled('teamBroker') && teamType.getFeatureProperty('teamBroker', true)),
            tables: !!(app.config.features.enabled('tables') && teamType.getFeatureProperty('tables', true))
        }
        response.assistant = {
            enabled: app.config.assistant?.enabled || false,
            requestTimeout: app.config.assistant?.requestTimeout || 60000,
            mcp: { enabled: true }, // default to enabled
            completions: { enabled: true, inlineEnabled: false } // default to enabled
        }
        if (app.config.assistant?.mcp && typeof app.config.assistant.mcp === 'object') {
            response.assistant.mcp = { ...app.config.assistant.mcp }
        }
        if (app.config.assistant?.completions && typeof app.config.assistant.completions === 'object') {
            response.assistant.completions = { ...app.config.assistant.completions }
        }
        const isLicensed = app.license.active() || false
        const licenseType = isLicensed ? (app.license.get('dev') ? 'DEV' : 'EE') : 'CE'
        const tier = isLicensed ? app.license.get('tier') : null
        const completionsTiers = [
            'starter',
            'teams', // AKA "pro" tier
            'enterprise'
        ]
        const minTier = app.config.assistant?.completions?.inlineMinTier || 'teams'
        const inlineDisabled = app.config.assistant?.completions?.inlineEnabled === false
        response.assistant.completions.inlineEnabled = !inlineDisabled && (completionsTiers.indexOf(tier) >= completionsTiers.indexOf(minTier) || licenseType === 'DEV')

        const linkedUsername = `device:${request.device.hashid}`
        const linkedUser = await app.db.models.TeamBrokerClient.byUsername(linkedUsername, request.device.Team.hashid, false, false)
        const linked = linkedUser?.ownerType === 'device' && +linkedUser?.ownerId === request.device.id
        response.mqttNodes = {
            enabled: !!response.features.teamBroker,
            username: linked ? linkedUsername : '',
            linked
        }

        const teamNPMEnabled = app.config.features.enabled('npm') && teamType.getFeatureProperty('npm', false)
        if (teamNPMEnabled) {
            const npmRegURL = new URL(app.config.npmRegistry.url)
            const team = request.device.Team.hashid
            const deviceNPMPassword = await app.db.controllers.AccessToken.createTokenForNPM(request.device, request.device.Team)
            const token = Buffer.from(`d-${request.device.hashid}@${team}:${deviceNPMPassword.token}`).toString('base64')
            if (!response.palette) {
                response.palette = {}
            }
            if (response.palette.npmrc) {
                settings.palette = settings.palette || {}
                settings.palette.npmrc = `${settings.palette.npmrc || ''}\n` +
                    `@flowfuse-${team}:registry=${app.config.npmRegistry.url}\n` +
                    `//${npmRegURL.host}:_auth="${token}"\n`
            } else {
                response.palette.npmrc =
                    `@flowfuse-${team}:registry=${app.config.npmRegistry.url}\n` +
                    `//${npmRegURL.host}:_auth="${token}"\n`
            }

            if (response.palette.catalogues) {
                response.palette.catalogues
                    .push(`${app.config.base_url}/api/v1/teams/${team}/npm/catalogue?device=${request.device.hashid}`)
            } else {
                response.palette.catalogues = [
                    'https://catalogue.nodered.org/catalogue.json',
                    `${app.config.base_url}/api/v1/teams/${team}/npm/catalogue?device=${request.device.hashid}`
                ]
            }
        }

        // Platform wide catalogue and npm registry
        const platformNPMEnabled = !!app.config.features.enabled('certifiedNodes') && !!teamType.getFeatureProperty('certifiedNodes', false)
        if (platformNPMEnabled) {
            const npmRegURLString = app.settings.get('platform:certifiedNodes:npmRegistryURL')
            const token = app.settings.get('platform:certifiedNodes:token')
            const catalogueString = app.settings.get('platform:certifiedNodes:catalogueURL')
            if (npmRegURLString && token && catalogueString) {
                const npmRegURL = new URL(npmRegURLString)
                const catalogue = new URL(catalogueString)
                if (!response.palette) {
                    response.palette = {}
                }
                if (response.palette?.catalogues) {
                    response.palette.catalogues
                        .push(catalogue.toString())
                } else {
                    response.palette.catalogues = [
                        catalogue.toString()
                    ]
                }
                if (response.palette?.npmrc) {
                    response.palette.npmrc = `${response.palette.npmrc}\n` +
                        `@flowfuse-certified-nodes:registry=${npmRegURL.toString()}\n` +
                        `//${npmRegURL.host}:_auth="${token}"\n`
                } else {
                    response.palette.npmrc =
                        `@flowfuse-certified-nodes:registry=${npmRegURL.toString()}\n` +
                        `//${npmRegURL.host}:_auth="${token}"\n`
                }
            }
        }

        if (settings.security?.httpNodeAuth?.type) {
            response.security = settings.security
            if (response.security.httpNodeAuth.type === 'flowforge-user') {
                // Convert the old 'flowforge-user' type to 'ff-user'
                response.security.httpNodeAuth.type = 'ff-user'
                // Regenerate the auth client for this device
                const authClient = await app.db.controllers.AuthClient.createClientForDevice(request.device)
                response.security.httpNodeAuth.clientID = authClient.clientID
                response.security.httpNodeAuth.clientSecret = authClient.clientSecret
            }
        }

        reply.send(response)
    })
}
