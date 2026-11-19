/**
 * One QuestDB server per team on Kubernetes: a Secret, PVC, Deployment, Service and Ingress
 * in `options.namespace`, all named `ts-<slug>`.
 *
 * forge's service account needs create, get, list, update and delete on those kinds in that
 * namespace, plus the PgBouncer team-list Secret. The Helm chart grants this
 * (forge.timeseries) and creates PgBouncer.
 *
 * options:
 *   image, domain, namespace, tiers, defaultTier
 *   storageClass, ingressClass, ingressAnnotations, tlsSecretName, nodeSelector, tolerations
 *   readyTimeout  milliseconds to wait for a new server (default 300000)
 */
const resources = require('./kubernetesResources')

let app
let options
let config
let core
let appsApi
let networking

function isNotFound (err) {
    return err?.code === 404 || err?.statusCode === 404 || err?.response?.statusCode === 404
}

async function ignoreNotFound (promise) {
    try {
        return await promise
    } catch (err) {
        if (!isNotFound(err)) {
            throw err
        }
    }
}

async function readDeployment (database) {
    const { name, namespace } = resources.names(database, options)
    return appsApi.readNamespacedDeployment({ name, namespace })
}

async function replaceDeployment (deployment) {
    const { name, namespace } = deployment.metadata
    return appsApi.replaceNamespacedDeployment({ name, namespace, body: deployment })
}

async function waitUntilReady (database) {
    const timeout = options.readyTimeout ?? 300000
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
        const deployment = await readDeployment(database)
        if ((deployment.status?.readyReplicas ?? 0) >= 1) {
            return
        }
        await new Promise(resolve => setTimeout(resolve, 3000))
    }
    throw new Error(`QuestDB did not become ready within ${timeout / 1000}s`)
}

async function scale (database, replicas) {
    const deployment = await readDeployment(database)
    deployment.spec.replicas = replicas
    await replaceDeployment(deployment)
}

async function removeAll (database) {
    const { name, namespace } = resources.names(database, options)
    await ignoreNotFound(networking.deleteNamespacedIngress({ name, namespace }))
    await ignoreNotFound(core.deleteNamespacedService({ name, namespace }))
    await ignoreNotFound(appsApi.deleteNamespacedDeployment({ name, namespace }))
    await ignoreNotFound(core.deleteNamespacedPersistentVolumeClaim({ name, namespace }))
    await ignoreNotFound(core.deleteNamespacedSecret({ name, namespace }))
}

function parseQuantity (value) {
    const match = String(value).match(/^(\d+(?:\.\d+)?)([KMGTPE]i?)?$/)
    if (!match) {
        return NaN
    }
    const powers = { K: 1, M: 2, G: 3, T: 4, P: 5, E: 6 }
    const unit = match[2] || ''
    const base = unit.endsWith('i') ? 1024 : 1000
    return Number(match[1]) * base ** (powers[unit[0]] || 0)
}

module.exports = {
    init: async (_app, _options, _config) => {
        app = _app
        options = _options || {}
        config = _config || {}
        for (const key of ['image', 'domain', 'namespace']) {
            if (!options[key]) {
                throw new Error(`timeseries.driver.options.${key} is required`)
            }
        }
        // client-node 1.x is an ES module
        const k8s = await import('@kubernetes/client-node')
        const kc = new k8s.KubeConfig()
        kc.loadFromDefault()
        core = kc.makeApiClient(k8s.CoreV1Api)
        appsApi = kc.makeApiClient(k8s.AppsV1Api)
        networking = kc.makeApiClient(k8s.NetworkingV1Api)
        app.log.info(`[timeseries] kubernetes driver using namespace ${options.namespace}`)
    },

    shutdown: async () => {},

    create: async (team, database, { credentials, tier }) => {
        const namespace = options.namespace
        try {
            await core.createNamespacedSecret({ namespace, body: resources.secret(team, database, options, credentials) })
            await core.createNamespacedPersistentVolumeClaim({ namespace, body: resources.persistentVolumeClaim(team, database, options, tier) })
            await appsApi.createNamespacedDeployment({ namespace, body: resources.deployment(team, database, options, tier) })
            await core.createNamespacedService({ namespace, body: resources.service(team, database, options) })
            await networking.createNamespacedIngress({ namespace, body: resources.ingress(team, database, options) })
            await waitUntilReady(database)
        } catch (err) {
            // A brand-new volume holds nothing, so undo everything
            await removeAll(database).catch(cleanupErr => {
                app.log.error(`[timeseries] cleanup after failed create of ${database.meta.slug} failed: ${cleanupErr.message}`)
            })
            throw err
        }
        return {
            endpoints: resources.endpoints(database, options),
            meta: { namespace }
        }
    },

    remove: async (team, database) => {
        await removeAll(database)
    },

    suspend: async (team, database) => {
        await scale(database, 0)
    },

    resume: async (team, database) => {
        await scale(database, 1)
        await waitUntilReady(database)
    },

    resize: async (team, database, tier, previousTier) => {
        const { name, namespace } = resources.names(database, options)
        if (previousTier && parseQuantity(tier.storage) < parseQuantity(previousTier.storage)) {
            throw new Error('Storage can only grow')
        }
        const pvc = await core.readNamespacedPersistentVolumeClaim({ name, namespace })
        if (parseQuantity(tier.storage) > parseQuantity(pvc.spec.resources.requests.storage)) {
            pvc.spec.resources.requests.storage = tier.storage
            await core.replaceNamespacedPersistentVolumeClaim({ name, namespace, body: pvc })
        }
        const deployment = await readDeployment(database)
        const limits = { cpu: String(tier.cpu), memory: tier.memory }
        deployment.spec.template.spec.containers[0].resources = { requests: limits, limits }
        await replaceDeployment(deployment)
        await waitUntilReady(database)
    },

    rotateCredentials: async (team, database, credentials) => {
        const { name, namespace } = resources.names(database, options)
        const secret = await core.readNamespacedSecret({ name, namespace })
        const fresh = resources.secret(team, database, options, credentials)
        secret.data = undefined
        secret.stringData = fresh.stringData
        await core.replaceNamespacedSecret({ name, namespace, body: secret })
        // Environment from a Secret is only read at start, so restart the pod
        const deployment = await readDeployment(database)
        deployment.spec.template.metadata.annotations = {
            ...(deployment.spec.template.metadata.annotations || {}),
            'flowfuse.com/restartedAt': new Date().toISOString()
        }
        await replaceDeployment(deployment)
        await waitUntilReady(database)
    },

    status: async (team, database) => {
        try {
            const deployment = await readDeployment(database)
            if ((deployment.spec?.replicas ?? 1) === 0) {
                return 'stopped'
            }
            return (deployment.status?.readyReplicas ?? 0) >= 1 ? 'running' : 'starting'
        } catch (err) {
            if (isNotFound(err)) {
                return 'missing'
            }
            throw err
        }
    },

    writePgbouncer: async (files) => {
        const secretName = config.pgbouncer?.secretName
        if (!secretName) {
            return
        }
        const namespace = options.namespace
        const data = require('../pgbouncer').toSecretData(files)
        let secret
        try {
            secret = await core.readNamespacedSecret({ name: secretName, namespace })
        } catch (err) {
            if (!isNotFound(err)) {
                throw err
            }
            await core.createNamespacedSecret({
                namespace,
                body: { apiVersion: 'v1', kind: 'Secret', metadata: { name: secretName, namespace }, type: 'Opaque', data }
            })
            return
        }
        secret.data = data
        await core.replaceNamespacedSecret({ name: secretName, namespace, body: secret })
    },

    // Exposed for tests
    _parseQuantity: parseQuantity
}
