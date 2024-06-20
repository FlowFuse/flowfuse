const childProcess = require('child_process')

const mailpitLogger = (data) => {
    console.info(`Mailpit: ${data}`)
}

module.exports = async function (config = {}) {
    let { webPort, smtpPort } = config

    webPort = webPort || 8025
    smtpPort = smtpPort || 1025

    mailpitLogger('Starting e-mail server...')

    const dockerCommand = 'docker'
    const args = [
        'run',
        '--rm',
        `-p=${webPort}:8025`,
        `-p=${smtpPort}:1025`,
        '-e=MP_MAX_MESSAGES=5000',
        '-e=MP_SMTP_AUTH_ACCEPT_ANY=1',
        '-e=MP_SMTP_AUTH_ALLOW_INSECURE=1',
        'axllent/mailpit'
    ]

    const dockerProcess = childProcess.spawn(dockerCommand, args)

    dockerProcess.on('spawn', () => {
        mailpitLogger(`Web UI available at http://localhost:${webPort}/ with SMTP listening on port ${smtpPort}`)
    })

    // dockerProcess.stdout.on('data', mailpitLogger)
    dockerProcess.stderr.on('data', mailpitLogger)

    dockerProcess.on('close', (code) => {
        console.error(`Child process exited with code ${code}`)
    })

    // Handle process exit to clean up the Docker container
    // const cleanup = () => {
    // ... clean up code here
    //     process.exit(0)
    // }

    // process.on('exit', cleanup)
    // process.on('SIGINT', cleanup)
    // process.on('SIGTERM', cleanup)
}
