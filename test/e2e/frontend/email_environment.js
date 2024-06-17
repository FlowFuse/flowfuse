const childProcess = require('child_process')
const path = require('path')

const mailpitLogger = (data) => {
    console.info(`Mailpit: ${data}`)
}

module.exports = (async function (settings = {}, config = {}) {
    mailpitLogger('Starting e-mail server...')

    const dockerCommand = 'docker'
    const args = ['compose', '-f', path.join(__dirname, 'docker-compose.yml'), 'up']

    const dockerProcess = childProcess.spawn(dockerCommand, args)

    dockerProcess.on('spawn', () => {
        mailpitLogger('Web UI available at http://localhost:8025/ with SMTP listening on port 1025')
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
})()
