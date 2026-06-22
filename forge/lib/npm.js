// Utility functions for working with npmrc files

const jwt = require('jsonwebtoken')

function updateCertifiedNodesToken (token, teamId) {
    const decoded = Buffer.from(token, 'base64').toString('utf-8')
    const parts = decoded.split(':')
    const newPlainText = `${parts[0]}/${teamId}:${parts[1]}`
    return Buffer.from(newPlainText).toString('base64')
}

function decodeCertifiedNodesToken (token, teamId) {
    const response = {}
    try {
        const obj = jwt.verify(token, '', { algorithms: 'none' })
        response.token = updateCertifiedNodesToken(obj.token, teamId)
        response.catalogues = obj.catalogues || []
    } catch (err) {
        // not a token
        response.token = updateCertifiedNodesToken(token, teamId)
        response.catalogues = null
    }
    return response
}

module.exports = {
    updateCertifiedNodesToken,
    decodeCertifiedNodesToken
}
