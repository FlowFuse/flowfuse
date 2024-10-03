module.exports.init = function (app) {
    // enable Team Broker Feature 
    app.config.features.register('teamBroker', true, true)

    /*
     * need to add functions here to boot clients when team 
     * or when client creds removed
     */
}