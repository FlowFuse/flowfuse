/**
 * Check when SSO certs expire
 */
const crypto = require('crypto')

const TWO_WEEKS = (60 * 60 * 24 * 14 * 1000)

module.exports = {
    name: 'checkSAMLCertificateExpiry',
    startup: false,
    delay: 5000,
    schedule: '@weekly',
    run: async function (app) {
        app.log.info('Checking SSO Cert life')
        try {
            const ssoConfigs = await app.db.models.SAMLProvider.getAll()
            for (const sso of ssoConfigs.providers) {
                if (sso.active && sso.type === 'saml') {
                    if (sso.options.cert) {
                        try {
                            let pem = sso.options.cert
                            if (!pem.startsWith('-----BEGIN CERTIFICATE-----\n')) {
                                pem = `-----BEGIN CERTIFICATE-----\n${pem}\n-----END CERTIFICATE-----\n`
                            }
                            const cert = new crypto.X509Certificate(pem)
                            const expiry = Date.parse(cert.validTo)
                            const life = expiry - Date.now()
                            if (life < TWO_WEEKS) {
                                app.log.info(`SSO Certificate expires soon ${sso.name} ${cert.validTo}`)
                                await emailAdmins(app, 'SSOCertsExpiring', { name: sso.name, date: cert.validTo })
                            }
                        } catch (err) {
                            app.log.debug(`Problem checking SSO certificate ${err.toString()}`)
                        }
                    }
                }
            }
        } catch (err) {
            app.log.debug(`Problem checking SSO certificate ${err.toString()}`)
        }
    }
}

async function emailAdmins (app, template, context) {
    const admins = await app.db.models.User.admins()
    for (const admin of admins) {
        await app.postoffice.send(admin, template, context)
    }
}
