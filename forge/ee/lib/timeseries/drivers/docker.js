/**
 * One QuestDB container and named volume per team on Docker Compose installs.
 *
 * Containers join the compose network, so hosted instances reach them as `ts-<slug>`.
 * nginx-proxy publishes ILP over HTTP at `<slug>.<domain>` (VIRTUAL_HOST), and a per-host
 * file in the shared vhost.d volume limits that hostname to the ILP write paths and /ping.
 * Devices query through PgBouncer, whose team list is written to `pgbouncer.configDir`.
 *
 * options:
 *   image, domain, tiers, defaultTier
 *   socket        Docker socket (default: the instance driver's socket, then /var/run/docker.sock)
 *   network       compose network (default: detected like driver-docker)
 *   letsencrypt   ask acme-companion for a certificate per team hostname
 *   tls           team hostnames are served over https (default: letsencrypt)
 *   vhostDir      nginx-proxy vhost.d directory shared with forge (default /etc/nginx/vhost.d)
 *   readyTimeout  milliseconds to wait for a new server (default 120000)
 */
const fs = require('fs/promises')
const path = require('path')

const pgbouncer = require('../pgbouncer')

const DATA_DIR = '/var/lib/questdb'
const LABEL_COMPONENT = 'flowfuse.com/component'
const LABEL_TEAM = 'flowfuse.com/team'
const ALLOWED_PATHS = '^/(write|api/v2/write|ping)$'
// The QuestDB image has no curl or wget, so the health endpoint is read with bash's /dev/tcp
const HEALTH_CMD = ['bash', '-c', 'exec 3<>/dev/tcp/127.0.0.1/9003 && printf "GET / HTTP/1.0\\r\\n\\r\\n" >&3 && head -1 <&3 | grep -q " 200"']

let app
let docker
let options
let config
let network

function names (database) {
    const slug = database.meta.slug
    return {
        container: `ts-${slug}`,
        volume: `ts-${slug}`,
        host: `${slug}.${options.domain}`
    }
}

function parseMemory (value) {
    if (typeof value === 'number') {
        return value
    }
    const match = String(value).match(/^(\d+(?:\.\d+)?)\s*([kmgt]i?)?b?$/i)
    if (!match) {
        throw new Error(`Invalid memory size: ${value}`)
    }
    const unit = (match[2] || '').toLowerCase()
    const powers = { '': 0, k: 1, ki: 1, m: 2, mi: 2, g: 3, gi: 3, t: 4, ti: 4 }
    return Math.round(Number(match[1]) * 1024 ** powers[unit])
}

function resources (tier) {
    const memory = parseMemory(tier.memory)
    return {
        Memory: memory,
        MemorySwap: memory,
        NanoCpus: Math.round(Number(tier.cpu) * 1e9)
    }
}

async function detectNetwork () {
    if (options.network) {
        return options.network
    }
    const networks = await docker.listNetworks({ filters: { label: ['com.docker.compose.network=flowforge'] } })
    if (networks.length === 1) {
        return networks[0].Name
    }
    // Several compose projects: use the one this forge container is on
    for (const candidate of networks) {
        const details = await docker.getNetwork(candidate.Id).inspect()
        if (Object.keys(details.Containers || {}).some(id => process.env.HOSTNAME && id.startsWith(process.env.HOSTNAME))) {
            return candidate.Name
        }
    }
    throw new Error('Unable to find the flowforge Docker network, set timeseries.driver.options.network')
}

async function writeVhostFile (host) {
    const dir = options.vhostDir || '/etc/nginx/vhost.d'
    const file = path.join(dir, `${host}_location`)
    // Included inside nginx-proxy's `location /` for this host. Everything except ILP writes
    // and /ping returns 404, which hides the web console and the SQL endpoint.
    const content = [
        '# Written by FlowFuse: only ILP writes and /ping are reachable from outside',
        `if ($uri !~ "${ALLOWED_PATHS}") {`,
        '    return 404;',
        '}',
        ''
    ].join('\n')
    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(file, content)
}

async function removeVhostFile (host) {
    const dir = options.vhostDir || '/etc/nginx/vhost.d'
    await fs.rm(path.join(dir, `${host}_location`), { force: true })
}

function containerSpec (team, database, credentials, tier) {
    const { container, volume, host } = names(database)
    const env = [
        `QDB_HTTP_USER=${credentials.httpUser}`,
        `QDB_HTTP_PASSWORD=${credentials.httpPassword}`,
        `QDB_PG_USER=${credentials.pgUser}`,
        `QDB_PG_PASSWORD=${credentials.pgPassword}`,
        'QDB_LINE_TCP_ENABLED=false',
        'QDB_METRICS_ENABLED=true',
        'QDB_RAM_USAGE_LIMIT_PERCENT=80',
        // With HTTP auth on, the health endpoint would otherwise need credentials too
        'QDB_HTTP_HEALTH_CHECK_AUTHENTICATION_REQUIRED=false',
        'QDB_CONFIG_VALIDATION_STRICT=true',
        `VIRTUAL_HOST=${host}`,
        'VIRTUAL_PORT=9000'
    ]
    if (options.letsencrypt) {
        env.push(`LETSENCRYPT_HOST=${host}`)
    }
    return {
        name: container,
        Image: database.image || options.image,
        Env: env,
        Labels: {
            [LABEL_COMPONENT]: 'timeseries',
            [LABEL_TEAM]: team.hashid
        },
        Healthcheck: {
            Test: ['CMD', ...HEALTH_CMD],
            Interval: 10e9,
            Timeout: 5e9,
            Retries: 3,
            StartPeriod: 120e9
        },
        HostConfig: {
            NetworkMode: network,
            RestartPolicy: { Name: 'unless-stopped' },
            Mounts: [{ Type: 'volume', Source: volume, Target: DATA_DIR }],
            ...resources(tier)
        }
    }
}

async function pullImage (image) {
    const images = await docker.listImages({ filters: { reference: [image] } })
    if (images.length) {
        return
    }
    const stream = await docker.pull(image)
    await new Promise((resolve, reject) => {
        docker.modem.followProgress(stream, err => err ? reject(err) : resolve())
    })
}

async function exec (container, cmd) {
    const run = await container.exec({ Cmd: cmd, AttachStdout: true, AttachStderr: true })
    const stream = await run.start({})
    await new Promise(resolve => {
        stream.on('end', resolve)
        stream.on('close', resolve)
        stream.resume()
    })
    const result = await run.inspect()
    return result.ExitCode
}

// The health endpoint on 9003 is checked from inside the container, so this works whether or
// not forge itself is on the compose network.
async function waitUntilReady (container) {
    const timeout = options.readyTimeout ?? 120000
    const deadline = Date.now() + timeout
    while (Date.now() < deadline) {
        const info = await container.inspect()
        if (!info.State.Running) {
            throw new Error(`QuestDB container stopped: ${info.State.Status} (exit code ${info.State.ExitCode})`)
        }
        if (await exec(container, HEALTH_CMD).catch(() => 1) === 0) {
            return
        }
        await new Promise(resolve => setTimeout(resolve, 2000))
    }
    throw new Error(`QuestDB did not become ready within ${timeout / 1000}s`)
}

async function startContainer (team, database, credentials, tier) {
    const image = database.image || options.image
    await pullImage(image)
    const container = await docker.createContainer(containerSpec(team, database, credentials, tier))
    await container.start()
    await waitUntilReady(container)
    return container
}

async function removeContainer (name) {
    const container = docker.getContainer(name)
    try {
        await container.remove({ force: true })
    } catch (err) {
        if (err.statusCode !== 404) {
            throw err
        }
    }
}

function endpoints (database) {
    const { container, host } = names(database)
    const tls = options.tls ?? options.letsencrypt === true
    return {
        internal: { host: container, httpPort: 9000, pgPort: 8812 },
        external: { host, httpProtocol: tls ? 'https' : 'http', httpPort: tls ? 443 : 80 }
    }
}

module.exports = {
    init: async (_app, _options, _config) => {
        app = _app
        options = _options || {}
        config = _config || {}
        if (!options.image) {
            throw new Error('timeseries.driver.options.image is required')
        }
        if (!options.domain) {
            throw new Error('timeseries.driver.options.domain is required')
        }
        const Docker = require('dockerode')
        docker = new Docker({
            socketPath: options.socket || app.config.driver?.options?.socket || '/var/run/docker.sock'
        })
        network = await detectNetwork()
        app.log.info(`[timeseries] docker driver using network ${network}`)
    },

    shutdown: async () => {},

    create: async (team, database, { credentials, tier }) => {
        const { volume, container, host } = names(database)
        try {
            await docker.createVolume({
                Name: volume,
                Labels: { [LABEL_COMPONENT]: 'timeseries', [LABEL_TEAM]: team.hashid }
            })
            await writeVhostFile(host)
            const started = await startContainer(team, database, credentials, tier)
            return {
                endpoints: endpoints(database),
                meta: { containerId: started.id, volume }
            }
        } catch (err) {
            // Nothing in a brand-new volume is worth keeping, so undo everything
            await removeContainer(container).catch(() => {})
            await docker.getVolume(volume).remove().catch(() => {})
            await removeVhostFile(host).catch(() => {})
            throw err
        }
    },

    remove: async (team, database) => {
        const { volume, container, host } = names(database)
        await removeContainer(container)
        try {
            await docker.getVolume(volume).remove()
        } catch (err) {
            if (err.statusCode !== 404) {
                throw err
            }
        }
        await removeVhostFile(host)
    },

    suspend: async (team, database) => {
        await docker.getContainer(names(database).container).stop().catch(err => {
            // 304: already stopped
            if (err.statusCode !== 304) {
                throw err
            }
        })
    },

    resume: async (team, database) => {
        const container = docker.getContainer(names(database).container)
        await container.start().catch(err => {
            if (err.statusCode !== 304) {
                throw err
            }
        })
        await waitUntilReady(container)
    },

    // Docker volumes have no size limit, so only CPU and memory change
    resize: async (team, database, tier) => {
        await docker.getContainer(names(database).container).update(resources(tier))
    },

    // Credentials are environment variables, so the container is recreated on the same volume
    rotateCredentials: async (team, database, credentials) => {
        const { container } = names(database)
        const tier = (options.tiers || {})[database.tier]
        await removeContainer(container)
        await startContainer(team, database, credentials, tier)
    },

    status: async (team, database) => {
        try {
            const info = await docker.getContainer(names(database).container).inspect()
            return info.State.Running ? 'running' : 'stopped'
        } catch (err) {
            if (err.statusCode === 404) {
                return 'missing'
            }
            throw err
        }
    },

    writePgbouncer: async (files) => {
        const dir = config.pgbouncer?.configDir
        if (!dir) {
            return
        }
        await pgbouncer.writeToDirectory(dir, files)
    },

    // Exposed for tests
    _containerSpec: containerSpec,
    _parseMemory: parseMemory
}
