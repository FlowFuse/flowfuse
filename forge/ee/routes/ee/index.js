module.exports = async function (app) {
    app.get('/features', async (request, response) => {
        response.send({
            billing: !!app.config.billing
        })
    })
}
