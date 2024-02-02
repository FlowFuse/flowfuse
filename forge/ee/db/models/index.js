const Hashids = require('hashids/cjs')
const { Model, DataTypes } = require('sequelize')
const hashids = {}

const modelTypes = [
    'Subscription',
    'SAMLProvider',
    'StorageSharedLibrary',
    'UserBillingCode',
    'Pipeline',
    'PipelineStage',
    'PipelineStageInstance',
    'PipelineStageDevice',
    'PipelineStageDeviceGroup',
    'FlowTemplate',
    'MFAToken'
]

async function init (app) {
    const sequelize = app.db.sequelize
    const allModels = []

    function getHashId (type) {
        if (!hashids[type]) {
            // This defers trying to access app.settings until after the
            // database has been initialised
            hashids[type] = new Hashids((app.settings.get('instanceId') || '') + type, 10)
        }
        return hashids[type]
    }

    modelTypes.forEach(type => {
        const m = require(`./${type}`)

        if (m.name !== type) {
            throw new Error(`Model name mismatch '${m.name}' !== '${type}'`)
        }

        const opts = {
            sequelize,
            modelName: m.name,
            ...(m.options || {})
        }

        if (m.scopes) {
            opts.scopes = m.scopes
        }
        if (m.hooks) {
            if (typeof m.hooks === 'function') {
                opts.hooks = m.hooks.call(null, app.db.models)
            } else {
                opts.hooks = m.hooks
            }
        }
        if (m.indexes) {
            opts.indexes = m.indexes
        }
        if (!m.model) {
            m.model = class model extends Model {}
        }
        if (!m.schema?.slug && (!m.meta || m.meta.slug !== false)) {
            m.schema.slug = {
                type: DataTypes.VIRTUAL,
                get () {
                    return getHashId(m.name).encode(this.id)
                }
            }
        }

        if (!m.meta || m.meta.hashid !== false) {
            m.schema.hashid = {
                type: DataTypes.VIRTUAL,
                get () {
                    return getHashId(m.name).encode(this.id)
                },
                set (_) {
                    throw new Error('hashid is read-only')
                }
            }
            m.model.encodeHashid = function (id) {
                return getHashId(m.name).encode(id)
            }
            m.model.decodeHashid = function (hashid) {
                return getHashId(m.name).decode(hashid)
            }
        }

        if (!m.schema?.links && (!m.meta || m.meta.links !== false)) {
            m.schema.links = {
                type: DataTypes.VIRTUAL,
                get () {
                    return {
                        self: app.config.base_url + '/api/v1/' + m.name.toLowerCase() + 's/' + this.hashid
                    }
                }
            }
        }

        m.model.init(m.schema, opts)
        app.db.models[m.name] = m.model
        allModels.push(m)
    })

    allModels.forEach(m => {
        if (m.associations) {
            m.associations.call(m.model, app.db.models)
        }
        if (m.finders) {
            const finders = m.finders.call(m.model, app.db.models)
            if (finders.static) {
                Object.assign(m.model, finders.static)
            }
            if (finders.instance) {
                Object.assign(m.model.prototype, finders.instance)
            }
        }
    })
}

module.exports.init = init
