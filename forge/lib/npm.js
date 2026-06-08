// Utility functions for working with npmrc files

function updateCertifiedNodesToken (token, teamId) {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    const newPlainText = `${parts[0]}/${teamId}:${parts[1]}`
    return Buffer.from(newPlainText).toString('base64')
}

module.exports = {
    updateCertifiedNodesToken
}
