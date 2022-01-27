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

    if (EMAIL_ENABLED) {
        if (app.config.email.smtp) {
            const smtpConfig = app.config.email.smtp

            const mailDefaults = { from: '"FlowForge Platform" <donotreply@flowforge.com>' }

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
            mailTransport.sendMail(mail, err => {
                if (err) {
                    app.log.warn('Failed to send email:', err.toString())
                }
            })
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
