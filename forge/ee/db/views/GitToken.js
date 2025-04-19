module.exports = {
    token: function (app, token) {
        const result = token.toJSON()
        const filtered = {
            id: result.hashid,
            name: result.name
            // Do not include the token value in the response
        }
        return filtered
    },
    tokenList: function (app, tokens) {
        return tokens.map(token => this.token(app, token))
    }
}
