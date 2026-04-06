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
                            const cert = new crypto.X509Certificate(`-----BEGIN CERTIFICATE-----\n${sso.options.cert}\n-----END CERTIFICATE-----`)
                            const life = cert.validToDate - Date.now()
                            if (life < TWO_WEEKS) {
                                app.log.info(`SSO Certificate expires soon ${sso.name} ${cert.validTo}`)
                                emailAdmins(app, 'SSOCertsExpiring', { name: sso.name, date: cert.validTo })
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
    const admins = await app.db.models.Users.admins()
    for (const admin of admins) {
        await app.postoffice.send(admin, template, context)
    }
}