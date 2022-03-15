const fp = require('fastify-plugin')
const handlebars = require('handlebars')
const nodemailer = require('nodemailer')

const templates = {}

module.exports = fp(async function (app, _opts, next) {
    let mailTransport
    let exportableSettings = {}

    // mailTransport = nodemailer.createTransport(require("./localDelivery"));

    // Use a local var as we may decide to disable email if the transport
    // fails to verify
    let EMAIL_ENABLED = app.config.email.enabled

    const mailDefaults = { from: app.config.email.from ? app.config.email.from : '"FlowForge Platform" <donotreply@flowforge.com>' }

    if (EMAIL_ENABLED) {
        if (app.config.email.smtp) {
            const smtpConfig = app.config.email.smtp

            mailTransport = nodemailer.createTransport(smtpConfig, mailDefaults)

            exportableSettings = {
                host: smtpConfig.host,
                port: smtpConfig.port
            }
            // app.log.info(smtpConfig);

            mailTransport.verify(err => {
                if (err) {
                    app.log.error('Failed to verify email connection: %s', err.toString())
                    EMAIL_ENABLED = false
                }
            })
        } else if (app.config.email.transport) {
            mailTransport = nodemailer.createTransport(app.config.email.transport, mailDefaults)
            exportableSettings = { }
            app.log.info('Email using config provided transport')
        } else if (app.config.email.ses) {
            const aws = require('@aws-sdk/client-ses')
            const { defaultProvider } = require('@aws-sdk/credential-provider-node')

            const sesConfig = app.config.email.ses

            const ses = new aws.SES({
                apiVersion: '2010-12-01',
                region: sesConfig.region,
                defaultProvider
            })

            mailTransport = nodemailer.createTransport({
                SES: { ses, aws }
            }, mailDefaults)

            exportableSettings = {
                region: sesConfig.region
            }

            mailTransport.verify(err => {
                if (err) {
                    app.log.error('Failed to verify email connection: %s', err.toString())
                    EMAIL_ENABLED = false
                }
            })
        } else {
            app.log.info('Email not configured - no external email will be sent')
        }
    } else {
        app.log.info('Email not configured')
    }

    function loadTemplate (templateName) {
        const template = require(`./templates/${templateName}`)
        templates[templateName] = {
            subject: handlebars.compile(template.subject, { noEscape: true }),
            text: handlebars.compile(template.text, { noEscape: true }),
            html: handlebars.compile(template.html)
        }
        return templates[templateName]
    }

    /**
     * Send an email to a user
     *
     * @param user object - who to send the email to.
     * @param templateName string - name of template to use - from `./templates/`
     * @param context object - object of properties to evaluate the template with
     */
    async function send (user, templateName, context) {
        const template = templates[templateName] || loadTemplate(templateName)
        const templateContext = { user, ...context }

        const mail = {
            to: user.email,
            subject: template.subject(templateContext, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true }),
            text: template.text(templateContext, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true }),
            html: template.html(templateContext, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true })
        }
        if (EMAIL_ENABLED) {
            if (mailTransport) {
                mailTransport.sendMail(mail, err => {
                    if (err) {
                        app.log.warn(`Failed to send email: ${err.toString()}`)
                    }
                })
            }
            if (app.config.email.debug) {
                app.log.info(`
    -----------------------------------
    to: ${mail.to}
    subject: ${mail.subject}
    ------
    ${mail.text}
    -----------------------------------`)
            }
        }
    }

    function exportSettings (isAdmin) {
        if (!EMAIL_ENABLED) {
            return false
        } else {
            return isAdmin ? exportableSettings : true
        }
    }

    function enabled () {
        return EMAIL_ENABLED
    }

    app.decorate('postoffice', {
        enabled,
        send,
        exportSettings
    })

    next()
})
