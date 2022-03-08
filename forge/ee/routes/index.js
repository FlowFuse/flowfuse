module.exports = async function (app) {

	await app.register(require('./ee'), { logLevel: 'warn' })
	await app.register(require('./billing'), { prefix: '/billing' })
}