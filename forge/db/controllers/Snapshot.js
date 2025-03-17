const { ValidationError } = require('sequelize')
const hasProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key)

module.exports = {
    /**
     * Get a snapshot by ID
     * @param {*} app - app instance
     * @param {*} snapshotId
     */
    async getSnapshot (app, snapshotId) {
        return await app.db.models.Snapshot.byId(snapshotId)
    },

    /**
     * Export specific snapshot.
     * @param {*} app - app instance
     * @param {*} owner project/device-originator of this snapshot
     * @param {*} snapshot snapshot object to export
     * @param {Object} options
     * @param {String} [options.credentialSecret] secret to encrypt credentials with.
     * @param {Object} [options.credentials] (Optional) credentials to export. If omitted, credentials of the current owner will be re-encrypted with the provided `credentialSecret`.
     * @param {Object} [options.owner] (Optional) The owner project or device. If omitted, the snapshot's owner will be obtained from the database.
     * @param {Object} [options.components] (Optional) Components to include in the snapshot. Defaults to all components.
     * @param {Boolean} [options.components.flows] (Optional) Include flows in the snapshot. Defaults to true.
     * @param {Boolean} [options.components.credentials] (Optional) Include credentials in the snapshot. Defaults to true if `options.components.flows` is true, otherwise false.
     * @param {'all' | 'keys' | false} [options.components.envVars='all'] (Optional) Env Var options: `'All'` will keep keys and values, `'keys'` will keep only keys, `false` will remove them.
     */
    exportSnapshot: async function (app, snapshot, options) {
        const components = {
            flows: options.components?.flows ?? true,
            credentials: options.components?.credentials ?? true,
            envVars: ['all', 'keys', false].includes(options.components?.envVars) ? options.components.envVars : 'all'
        }
        if (components.flows === false) {
            components.credentials = false // no flows, no credentials!
        }

        if (components.credentials !== false && !options.credentialSecret) {
            return null
        }

        let owner = options.owner
        if (!owner) {
            if (snapshot.ownerType === 'device') {
                owner = await snapshot.getDevice()
            } else if (snapshot.ownerType === 'instance') {
                owner = await snapshot.getProject()
            } else {
                return null
            }
        }

        // ensure the owner is of the correct model type
        if (snapshot.ownerType === 'device' && owner?.constructor.name !== 'Device') {
            return null
        }
        if (snapshot.ownerType === 'instance' && owner?.constructor.name !== 'Project') {
            return null
        }

        // ensure the snapshot has the User association loaded
        if (snapshot.UserId && !snapshot.User) {
            await snapshot.reload({ include: [app.db.models.User] })
        }

        const result = {
            ...snapshot.toJSON()
        }

        // include/exclude components of the snapshot
        if (components.flows === false) {
            result.flows = {
                flows: [],
                credentials: {} // no flows, no credentials!
            }
        } else if (components.credentials === false) {
            result.flows = {
                flows: snapshot.flows.flows || [],
                credentials: {} // no credentials!
            }
        }
        if (components.envVars === false) {
            result.settings.env = {}
        } else if (components.envVars === 'keys' && snapshot.settings?.env && Object.keys(snapshot.settings.env).length > 0) {
            const keysOnly = Object.keys(snapshot.settings.env).reduce((acc, key) => {
                acc[key] = ''
                return acc
            }, {})
            result.settings = Object.assign({}, snapshot.settings, { env: keysOnly })
        }

        // loop keys of result.settings.env and remove any that match FF_*
        Object.keys(result.settings.env).forEach((key) => {
            if (key.startsWith('FF_')) {
                delete result.settings.env[key]
            }
        })

        if (components.flows === false || components.credentials === false) {
            result.flows.credentials = {}
        } else {
            // use the secret stored in the snapshot, if available...
            const currentSecret = result.credentialSecret || owner.credentialSecret || (owner.getCredentialSecret && await owner.getCredentialSecret())
            const credentials = options.credentials ? options.credentials : result.flows.credentials

            // if provided credentials already encrypted: "exportCredentials" will just return the same credentials
            // if provided credentials are raw: "exportCredentials" will encrypt them with the secret provided
            // if credentials are not provided: project's flows credentials will be used, they will be encrypted with the provided secret
            const keyToDecrypt = (options.credentials && options.credentials.$) ? options.credentialSecret : currentSecret
            result.flows.credentials = app.db.controllers.Project.exportCredentials(credentials || {}, keyToDecrypt, options.credentialSecret)
        }

        return result
    },

    /**
     * Delete a snapshot
     * @param {*} app - app instance
     * @param {*} snapshot - snapshot object
     */
    async deleteSnapshot (app, snapshot) {
        let owner

        if (snapshot.ownerType === 'device') {
            owner = await snapshot.getDevice()
        } else if (snapshot.ownerType === 'instance') {
            owner = await snapshot.getProject()
        } else {
            return false
        }

        const deviceSettings = await owner.getSetting('deviceSettings') || {
            targetSnapshot: null
        }
        if (deviceSettings.targetSnapshot === snapshot.id) {
            // We're about to delete the active snapshot for this device
            await owner.updateSetting('deviceSettings', {
                targetSnapshot: null
            })
            // The cascade relationship will ensure owner.targetSnapshotId is cleared
            if (app.comms) {
                const team = await owner.getTeam()
                app.comms.devices.sendCommandToProjectDevices(team.hashid, owner.id, 'update', {
                    snapshot: null
                })
            }
        }

        await snapshot.destroy()
        return true
    },

    /**
     * Update a snapshot
     * @param {*} app - app instance
     * @param {*} snapshot - snapshot object
     * @param {*} options - options to update
     * @param {String} [options.name] - name of the snapshot
     * @param {String} [options.description] - description of the snapshot
     */
    async updateSnapshot (app, snapshot, options) {
        const updates = {}
        if (hasProperty(options, 'name') && (typeof options.name !== 'string' || options.name.trim() === '')) {
            throw new ValidationError('Snapshot name is required')
        }
        if (options.name) {
            updates.name = options.name
        }
        if (typeof options.description !== 'undefined') {
            updates.description = options.description
        }
        if (Object.keys(updates).length > 0) {
            await snapshot.update(updates)
        }
        return snapshot
    },

    /**
     * Upload a snapshot.
     * @param {*} app - app instance
     * @param {*} owner - project/device-originator of this snapshot
     * @param {*} snapshot - snapshot data
     * @param {String} credentialSecret - secret to encrypt credentials with. Can be null if the snapshot does not contain credentials.
     * @param {*} user - user who uploaded the snapshot
     * @param {Object} [options] - additional options
     * @param {Object} [options.components] - Include flows in the snapshot. Defaults to true.
     * @param {Boolean} [options.components.flows] - Include flows in the snapshot. Defaults to true.
     * @param {Boolean} [options.components.credentials] - Include credentials in the snapshot. Defaults to true if `options.components.flows` is true, otherwise false.
     * @param {'all' | 'keys' | false} [options.components.envVars='all'] - Env Var options: `'All'` will keep keys and values, `'keys'` will keep only keys, `false` will remove them.
     */
    async uploadSnapshot (app, owner, snapshot, credentialSecret, user, options) {
        // Validate the owner
        let ownerType
        if (owner.constructor.name === 'Project') {
            ownerType = 'instance'
        } else if (owner.constructor.name === 'Device') {
            ownerType = 'device'
        } else {
            throw new Error('Invalid owner type')
        }

        const components = {
            flows: options?.components?.flows ?? true,
            credentials: options?.components?.credentials ?? true,
            envVars: ['all', 'keys', false].includes(options?.components?.envVars) ? options?.components.envVars : 'all'
        }
        if (components.flows === false) {
            components.credentials = false // no flows, no credentials!
        }

        // shallow clone the snapshot before modifying it
        const importSnapshot = Object.assign({}, snapshot)

        // include/exclude components of the snapshot
        if (components.flows === false) {
            importSnapshot.flows = {
                flows: [],
                credentials: {} // no flows, no credentials!
            }
        } else if (components.credentials === false) {
            importSnapshot.flows = {
                flows: snapshot.flows.flows || [],
                credentials: {} // no credentials!
            }
        }
        if (components.envVars === false) {
            importSnapshot.settings = {
                ...snapshot.settings,
                env: {} // no env vars!
            }
        } else if (components.envVars === 'keys' && snapshot.settings?.env && Object.keys(snapshot.settings.env).length > 0) {
            const keysOnly = Object.keys(snapshot.settings.env).reduce((acc, key) => {
                acc[key] = ''
                return acc
            }, {})
            importSnapshot.settings = Object.assign({}, snapshot.settings, { env: keysOnly })
        }

        const targetCredentialSecret = owner.credentialSecret || (owner.getCredentialSecret && await owner.getCredentialSecret()) || credentialSecret
        // 1. If the snapshot includes credentials but no credentialSecret, we should reject it
        // 2. if the snapshot includes credentials and a credentialSecret, we should reencrypt for the owner
        if (importSnapshot.flows.credentials?.$) {
            if (!credentialSecret) {
                throw new Error('Missing credentialSecret')
            }
            // Need to re-encrypt the credentials for the target
            importSnapshot.flows.credentials = app.db.controllers.Project.exportCredentials(importSnapshot.flows.credentials, credentialSecret, targetCredentialSecret)
        }

        const ProjectId = ownerType === 'instance' ? owner.id : null
        const DeviceId = ownerType === 'device' ? owner.id : null

        const snapshotOptions = {
            name: importSnapshot.name,
            description: importSnapshot.description || '',
            credentialSecret: targetCredentialSecret,
            settings: {
                settings: importSnapshot.settings?.settings || {},
                env: importSnapshot.settings?.env || {},
                modules: importSnapshot.settings?.modules || {}

            },
            flows: {
                flows: importSnapshot.flows.flows || [],
                credentials: importSnapshot.flows.credentials || { }
            },
            ProjectId,
            DeviceId,
            UserId: user.id
        }
        // remove an env vars that start with FF_ from the snapshot
        Object.keys(snapshotOptions.settings.env).forEach((key) => {
            if (key.startsWith('FF_')) {
                delete snapshotOptions.settings.env[key]
            }
        })
        // store the snapshot
        const newSnapshot = await app.db.models.ProjectSnapshot.create(snapshotOptions)
        return newSnapshot
    }
}
