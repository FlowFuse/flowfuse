module.exports = async function (app) {
    app.get('/features', {
        config: {
            allowAnonymous: true
        }
    }, async (request, response) => {
        response.send({
            billing: !!app.config.billing
        })
    })
}
