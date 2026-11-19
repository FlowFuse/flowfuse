/**
 * Kubernetes objects for one team's QuestDB server. Pure functions so they can be tested
 * without a cluster.
 */

const QUESTDB_UID = 10001
const COMPONENT = 'timeseries'

// Only ILP writes and /ping are routed from outside: no web console, no SQL over REST
const EXTERNAL_PATHS = ['/write', '/api/v2/write', '/ping']

function names (database, options) {
    const slug = database.meta.slug
    return {
        name: `ts-${slug}`,
        host: `${slug}.${options.domain}`,
        namespace: options.namespace
    }
}

function labels (team, database) {
    return {
        'app.kubernetes.io/name': 'questdb',
        'app.kubernetes.io/managed-by': 'flowfuse',
        'flowfuse.com/component': COMPONENT,
        'flowfuse.com/team': team.hashid,
        'flowfuse.com/timeseries': database.meta.slug
    }
}

function secret (team, database, options, credentials) {
    const { name, namespace } = names(database, options)
    return {
        apiVersion: 'v1',
        kind: 'Secret',
        metadata: { name, namespace, labels: labels(team, database) },
        type: 'Opaque',
        stringData: {
            'http-user': credentials.httpUser,
            'http-password': credentials.httpPassword,
            'pg-user': credentials.pgUser,
            'pg-password': credentials.pgPassword
        }
    }
}

function persistentVolumeClaim (team, database, options, tier) {
    const { name, namespace } = names(database, options)
    const spec = {
        accessModes: ['ReadWriteOnce'],
        resources: { requests: { storage: tier.storage } }
    }
    if (options.storageClass) {
        spec.storageClassName = options.storageClass
    }
    return {
        apiVersion: 'v1',
        kind: 'PersistentVolumeClaim',
        metadata: { name, namespace, labels: labels(team, database) },
        spec
    }
}

function secretEnv (envName, secretName, key) {
    return { name: envName, valueFrom: { secretKeyRef: { name: secretName, key } } }
}

function deployment (team, database, options, tier) {
    const { name, namespace } = names(database, options)
    const podLabels = labels(team, database)
    const resources = { cpu: String(tier.cpu), memory: tier.memory }
    const spec = {
        securityContext: {
            runAsNonRoot: true,
            runAsUser: QUESTDB_UID,
            runAsGroup: QUESTDB_UID,
            fsGroup: QUESTDB_UID
        },
        containers: [{
            name: 'questdb',
            image: database.image || options.image,
            ports: [
                { name: 'http', containerPort: 9000 },
                { name: 'pgwire', containerPort: 8812 },
                { name: 'health', containerPort: 9003 }
            ],
            env: [
                // The secret holds the values, so they never appear in the pod spec
                secretEnv('QDB_HTTP_USER', name, 'http-user'),
                secretEnv('QDB_HTTP_PASSWORD', name, 'http-password'),
                secretEnv('QDB_PG_USER', name, 'pg-user'),
                secretEnv('QDB_PG_PASSWORD', name, 'pg-password'),
                { name: 'QDB_LINE_TCP_ENABLED', value: 'false' },
                { name: 'QDB_METRICS_ENABLED', value: 'true' },
                { name: 'QDB_RAM_USAGE_LIMIT_PERCENT', value: '80' },
                // With HTTP auth on, the health endpoint the probes use would otherwise need credentials
                { name: 'QDB_HTTP_HEALTH_CHECK_AUTHENTICATION_REQUIRED', value: 'false' },
                { name: 'QDB_CONFIG_VALIDATION_STRICT', value: 'true' }
            ],
            resources: { requests: resources, limits: resources },
            volumeMounts: [{ name: 'data', mountPath: '/var/lib/questdb' }],
            // QuestDB replays its WAL on start, so allow two minutes before liveness applies
            startupProbe: { httpGet: { path: '/', port: 'health' }, periodSeconds: 5, failureThreshold: 24 },
            readinessProbe: { httpGet: { path: '/', port: 'health' }, periodSeconds: 10 },
            livenessProbe: { httpGet: { path: '/', port: 'health' }, periodSeconds: 20, failureThreshold: 3 },
            securityContext: {
                allowPrivilegeEscalation: false,
                capabilities: { drop: ['ALL'] }
            }
        }],
        volumes: [{ name: 'data', persistentVolumeClaim: { claimName: name } }]
    }
    if (options.nodeSelector && Object.keys(options.nodeSelector).length) {
        spec.nodeSelector = options.nodeSelector
    }
    if (options.tolerations?.length) {
        spec.tolerations = options.tolerations
    }
    return {
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        metadata: { name, namespace, labels: podLabels },
        spec: {
            replicas: 1,
            // A ReadWriteOnce volume can't attach to two pods during a rolling update
            strategy: { type: 'Recreate' },
            selector: { matchLabels: { 'flowfuse.com/timeseries': database.meta.slug } },
            template: {
                metadata: {
                    labels: podLabels,
                    annotations: {
                        'prometheus.io/scrape': 'true',
                        'prometheus.io/port': '9003'
                    }
                },
                spec
            }
        }
    }
}

function service (team, database, options) {
    const { name, namespace } = names(database, options)
    return {
        apiVersion: 'v1',
        kind: 'Service',
        metadata: { name, namespace, labels: labels(team, database) },
        spec: {
            type: 'ClusterIP',
            selector: { 'flowfuse.com/timeseries': database.meta.slug },
            ports: [
                { name: 'http', port: 9000, targetPort: 'http' },
                { name: 'pgwire', port: 8812, targetPort: 'pgwire' }
            ]
        }
    }
}

function ingress (team, database, options) {
    const { name, namespace, host } = names(database, options)
    const spec = {
        rules: [{
            host,
            http: {
                paths: EXTERNAL_PATHS.map(path => ({
                    path,
                    pathType: 'Exact',
                    backend: { service: { name, port: { number: 9000 } } }
                }))
            }
        }]
    }
    if (options.ingressClass) {
        spec.ingressClassName = options.ingressClass
    }
    if (options.tlsSecretName) {
        spec.tls = [{ hosts: [host], secretName: options.tlsSecretName }]
    }
    return {
        apiVersion: 'networking.k8s.io/v1',
        kind: 'Ingress',
        metadata: {
            name,
            namespace,
            labels: labels(team, database),
            annotations: { ...(options.ingressAnnotations || {}) }
        },
        spec
    }
}

function endpoints (database, options) {
    const { name, namespace, host } = names(database, options)
    return {
        // Instances run in another namespace, so the service is addressed with its namespace
        internal: { host: `${name}.${namespace}.svc`, httpPort: 9000, pgPort: 8812 },
        external: { host, httpProtocol: 'https', httpPort: 443 }
    }
}

module.exports = {
    names,
    labels,
    secret,
    persistentVolumeClaim,
    deployment,
    service,
    ingress,
    endpoints,
    EXTERNAL_PATHS
}
