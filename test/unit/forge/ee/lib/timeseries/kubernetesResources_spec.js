const should = require('should')

const kubernetes = require('../../../../../../forge/ee/lib/timeseries/drivers/kubernetes.js')
const resources = require('../../../../../../forge/ee/lib/timeseries/drivers/kubernetesResources.js')

describe('Timeseries: Kubernetes resources', function () {
    const team = { hashid: 'TeamHash1' }
    const database = { meta: { slug: 'abc123def456' }, image: null }
    const tier = { cpu: '1', memory: '2Gi', storage: '20Gi' }
    const credentials = { httpUser: 't_abc123def456', httpPassword: 'http-SECRET-1', pgUser: 't_abc123def456', pgPassword: 'pg-SECRET-2' }
    const options = {
        image: 'questdb/questdb:9.0.1',
        domain: 'ts.example.com',
        namespace: 'flowfuse-timeseries',
        storageClass: 'gp3-questdb',
        ingressClass: 'nginx',
        ingressAnnotations: { 'cert-manager.io/cluster-issuer': 'letsencrypt' },
        tlsSecretName: 'ts-wildcard',
        nodeSelector: { role: 'questdb' },
        tolerations: [{ key: 'questdb', operator: 'Exists', effect: 'NoSchedule' }]
    }

    it('names every object after the slug in the timeseries namespace', function () {
        for (const object of [
            resources.secret(team, database, options, credentials),
            resources.persistentVolumeClaim(team, database, options, tier),
            resources.deployment(team, database, options, tier),
            resources.service(team, database, options),
            resources.ingress(team, database, options)
        ]) {
            object.metadata.should.match({ name: 'ts-abc123def456', namespace: 'flowfuse-timeseries' })
            object.metadata.labels.should.match({ 'flowfuse.com/component': 'timeseries', 'flowfuse.com/team': 'TeamHash1', 'flowfuse.com/timeseries': 'abc123def456' })
        }
    })

    it('keeps credentials in the Secret and out of the pod spec', function () {
        const deployment = resources.deployment(team, database, options, tier)
        JSON.stringify(deployment).should.not.containEql('SECRET')
        const env = deployment.spec.template.spec.containers[0].env
        env.find(e => e.name === 'QDB_PG_PASSWORD').should.eql({ name: 'QDB_PG_PASSWORD', valueFrom: { secretKeyRef: { name: 'ts-abc123def456', key: 'pg-password' } } })
        resources.secret(team, database, options, credentials).stringData.should.match({ 'pg-password': 'pg-SECRET-2', 'pg-user': 't_abc123def456' })
    })

    it('runs one non-root pod with a Recreate strategy, guaranteed resources and the node placement', function () {
        const deployment = resources.deployment(team, database, options, tier)
        deployment.spec.replicas.should.equal(1)
        deployment.spec.strategy.should.eql({ type: 'Recreate' })
        const pod = deployment.spec.template.spec
        pod.securityContext.should.match({ runAsNonRoot: true, runAsUser: 10001, fsGroup: 10001 })
        pod.containers[0].resources.should.eql({ requests: { cpu: '1', memory: '2Gi' }, limits: { cpu: '1', memory: '2Gi' } })
        pod.nodeSelector.should.eql({ role: 'questdb' })
        pod.tolerations.should.have.length(1)
        pod.containers[0].env.should.containEql({ name: 'QDB_LINE_TCP_ENABLED', value: 'false' })
        pod.containers[0].env.should.containEql({ name: 'QDB_HTTP_HEALTH_CHECK_AUTHENTICATION_REQUIRED', value: 'false' })
    })

    it('requests the tier storage from the configured StorageClass', function () {
        const pvc = resources.persistentVolumeClaim(team, database, options, tier)
        pvc.spec.should.eql({ accessModes: ['ReadWriteOnce'], resources: { requests: { storage: '20Gi' } }, storageClassName: 'gp3-questdb' })
    })

    it('routes only the ILP write paths and /ping through the ingress', function () {
        const ingress = resources.ingress(team, database, options)
        ingress.spec.rules[0].host.should.equal('abc123def456.ts.example.com')
        ingress.spec.rules[0].http.paths.map(p => p.path).should.eql(['/write', '/api/v2/write', '/ping'])
        ingress.spec.rules[0].http.paths.every(p => p.pathType === 'Exact').should.be.true()
        ingress.spec.ingressClassName.should.equal('nginx')
        ingress.spec.tls.should.eql([{ hosts: ['abc123def456.ts.example.com'], secretName: 'ts-wildcard' }])
        ingress.metadata.annotations.should.eql({ 'cert-manager.io/cluster-issuer': 'letsencrypt' })
    })

    it('exposes HTTP and PGWire inside the cluster only', function () {
        const service = resources.service(team, database, options)
        service.spec.type.should.equal('ClusterIP')
        service.spec.ports.map(p => p.port).should.eql([9000, 8812])
    })

    it('addresses the service with its namespace for instances in other namespaces', function () {
        resources.endpoints(database, options).should.eql({
            internal: { host: 'ts-abc123def456.flowfuse-timeseries.svc', httpPort: 9000, pgPort: 8812 },
            external: { host: 'abc123def456.ts.example.com', httpProtocol: 'https', httpPort: 443 }
        })
    })

    it('omits optional settings that are not configured', function () {
        const minimal = { image: 'q', domain: 'ts.example.com', namespace: 'ns' }
        should.not.exist(resources.persistentVolumeClaim(team, database, minimal, tier).spec.storageClassName)
        should.not.exist(resources.deployment(team, database, minimal, tier).spec.template.spec.nodeSelector)
        should.not.exist(resources.ingress(team, database, minimal).spec.tls)
    })

    it('compares storage sizes across units', function () {
        kubernetes._parseQuantity('100Gi').should.be.above(kubernetes._parseQuantity('20Gi'))
        kubernetes._parseQuantity('1Ti').should.equal(1024 ** 4)
        kubernetes._parseQuantity('5G').should.equal(5e9)
    })

    describe('snapshots', function () {
        it('snapshots the server volume, labelled for the team and server', function () {
            const snapshot = resources.volumeSnapshot(team, database, options, 'ts-abc123def456-20261118030000')
            snapshot.should.match({
                apiVersion: 'snapshot.storage.k8s.io/v1',
                kind: 'VolumeSnapshot',
                metadata: {
                    name: 'ts-abc123def456-20261118030000',
                    namespace: 'flowfuse-timeseries',
                    labels: { 'flowfuse.com/component': 'timeseries', 'flowfuse.com/team': 'TeamHash1', 'flowfuse.com/timeseries': 'abc123def456' }
                },
                spec: { source: { persistentVolumeClaimName: 'ts-abc123def456' } }
            })
            snapshot.spec.should.not.have.property('volumeSnapshotClassName')
        })

        it('names the VolumeSnapshotClass only when one is configured', function () {
            const snapshot = resources.volumeSnapshot(team, database, { ...options, snapshots: { volumeSnapshotClass: 'ebs-snapshots' } }, 'name')
            snapshot.spec.volumeSnapshotClassName.should.equal('ebs-snapshots')
        })

        it('names snapshots after the server and the UTC time', function () {
            resources.snapshotName(database, new Date('2026-11-18T03:04:05.678Z')).should.equal('ts-abc123def456-20261118030405')
        })

        it('selects the snapshots of one server', function () {
            resources.snapshotSelector(database).should.equal('flowfuse.com/component=timeseries,flowfuse.com/timeseries=abc123def456')
        })

        it('treats a snapshot as taken once it has a creation time or is ready', function () {
            resources.snapshotTaken({}).should.be.false()
            resources.snapshotTaken({ status: {} }).should.be.false()
            resources.snapshotTaken({ status: { creationTime: '2026-11-18T03:00:00Z' } }).should.be.true()
            resources.snapshotTaken({ status: { readyToUse: true } }).should.be.true()
        })
    })

    describe('rollout', function () {
        it('is ready once the pod runs the latest spec', function () {
            resources.deploymentReady({ metadata: { generation: 2 }, status: { observedGeneration: 2, updatedReplicas: 1, readyReplicas: 1 } }).should.be.true()
        })

        it('is not ready while the controller has not seen the latest spec', function () {
            resources.deploymentReady({ metadata: { generation: 3 }, status: { observedGeneration: 2, updatedReplicas: 1, readyReplicas: 1 } }).should.be.false()
        })

        it('is not ready while the pod is not updated or not ready', function () {
            resources.deploymentReady({ metadata: { generation: 2 }, status: { observedGeneration: 2, readyReplicas: 1 } }).should.be.false()
            resources.deploymentReady({ metadata: { generation: 2 }, status: { observedGeneration: 2, updatedReplicas: 1 } }).should.be.false()
            resources.deploymentReady({ metadata: { generation: 1 } }).should.be.false()
        })
    })
})
