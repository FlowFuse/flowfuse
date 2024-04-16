module.exports = function (app) {
    app.addSchema({
        $id: 'ProvisioningTokenSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            team: { type: 'string', nullable: true },
            instance: { type: 'string' },
            expiresAt: { type: 'string', nullable: true },
            targetSnapshot: { type: 'string' }
        }
    })
    app.addSchema({
        $id: 'ProvisioningToken',
        type: 'object',
        allOf: [{ $ref: 'ProvisioningTokenSummary' }],
        properties: {
            token: { type: 'string' }
        }
    })
    async function provisioningTokenSummary (token) {
        // build a tokenSummary object from the token
        const tokenSummary = {
            id: token.hashid,
            name: 'Provisioning Token', // default name
            expiresAt: token.expiresAt,
            team: token.ownerType === 'team' ? app.db.models.Team.encodeHashid(+token.ownerId) : null
        }
        // extract key:value pairs from scope (excluding device:provision) and add
        // to tokenSummary as properties
        token.scope.forEach(e => {
            if (!e || !/.+:.+/.test(e)) { return } // ignore empty and invalid scopes
            if (e === 'device:provision') { return } // ignore device:provision
            const [key, value] = e.split(':', 2) // split on first colon
            tokenSummary[key] = value
        })
        // look up the snapshot name if a snapshot id is present
        if (tokenSummary.project) {
            const project = await app.db.models.Project.byId(tokenSummary.project)
            // Map to the external property name
            tokenSummary.instance = tokenSummary.project
            const deviceSettings = await project?.getSetting('deviceSettings') || {
                targetSnapshot: null
            }
            if (project && deviceSettings?.targetSnapshot) {
                const snapshot = await app.db.models.ProjectSnapshot.byId(deviceSettings.targetSnapshot, { includeFlows: false, includeSettings: false })
                tokenSummary.targetSnapshot = snapshot?.name
            }
        }
        return tokenSummary
    }

    app.addSchema({
        $id: 'PersonalAccessTokenSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            // scope: { type: 'string', nullable: true },
            expiresAt: { type: 'string', nullable: true }
        }
    })
    app.addSchema({
        $id: 'PersonalAccessToken',
        type: 'object',
        allOf: [{ $ref: 'PersonalAccessTokenSummary' }],
        properties: {
            token: { type: 'string' }
        }
    })

    function personalAccessTokenSummary (token) {
        const tokenSummary = {
            id: token.hashid,
            name: token.name,
            expiresAt: token.expiresAt
        }
        return tokenSummary
    }
    app.addSchema({
        $id: 'PersonalAccessTokenSummaryList',
        type: 'array',
        items: {
            $ref: 'PersonalAccessTokenSummary'
        }
    })
    function personalAccessTokenSummaryList (tokenArray) {
        return tokenArray.map(token => personalAccessTokenSummary(token))
    }

    app.addSchema({
        $id: 'InstanceHTTPTokenSummary',
        type: 'object',
        properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            // scope: { type: 'string', nullable: true },
            expiresAt: { type: 'string', nullable: true }
        }
    })
    app.addSchema({
        $id: 'InstanceHTTPToken',
        type: 'object',
        allOf: [{ $ref: 'InstanceHTTPTokenSummary' }],
        properties: {
            token: { type: 'string' }
        }
    })

    function instanceHTTPTokenSummary (token) {
        const tokenSummary = {
            id: token.hashid,
            name: token.name,
            expiresAt: token.expiresAt
        }
        return tokenSummary
    }
    app.addSchema({
        $id: 'InstanceHTTPTokenSummaryList',
        type: 'array',
        items: {
            $ref: 'InstanceHTTPTokenSummary'
        }
    })
    function instanceHTTPTokenSummaryList (tokenArray) {
        return tokenArray.map(token => instanceHTTPTokenSummary(token))
    }

    return {
        provisioningTokenSummary,
        personalAccessTokenSummary,
        personalAccessTokenSummaryList,
        instanceHTTPTokenSummary,
        instanceHTTPTokenSummaryList
    }
}
