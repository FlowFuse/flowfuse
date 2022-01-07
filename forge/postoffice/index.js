const fp = require("fastify-plugin");
const handlebars = require("handlebars");
const nodemailer = require("nodemailer");

const templates = {};

module.exports = fp(async function(app, _opts, next) {

    let mailTransport;
    let exportableSettings = {}

    // mailTransport = nodemailer.createTransport(require("./localDelivery"));

    let EMAIL_ENABLED = process.env.SMTP_DEBUG || !!process.env.SMTP_TRANSPORT_HOST;

    if (process.env.SMTP_TRANSPORT_HOST) {
        const smtpConfig = {
            host: process.env.SMTP_TRANSPORT_HOST,
            port: process.env.SMTP_TRANSPORT_PORT,
            secure: process.env.SMTP_TRANSPORT_TLS === "true",
            // logger:true,
            // debug: true
        }
        if (process.env.SMTP_TRANSPORT_AUTH_USER) {
            smtpConfig.auth = smtpConfig.auth || {}
            smtpConfig.auth.user = process.env.SMTP_TRANSPORT_AUTH_USER
        }
        if (process.env.SMTP_TRANSPORT_AUTH_PASS) {
            smtpConfig.auth = smtpConfig.auth || {}
            smtpConfig.auth.pass = process.env.SMTP_TRANSPORT_AUTH_PASS
        }

        const mailDefaults = { from: '"FlowForge Platform" <donotreply@flowforge.com>' }

        mailTransport = nodemailer.createTransport(smtpConfig, mailDefaults);

        exportableSettings = {
            host: process.env.SMTP_TRANSPORT_HOST,
            port: process.env.SMTP_TRANSPORT_PORT,
            secure: process.env.SMTP_TRANSPORT_TLS === "true",
        }
        // app.log.info(smtpConfig);

        mailTransport.verify(err => {
            if (err) {
                app.log.error("Failed to verify email connection: %s", err.toString())
                EMAIL_ENABLED = false
            }
        })
    } else if (!process.env.SMTP_DEBUG) {
        app.log.info("Email not configured")
    } else {
        app.log.info("Email debug output enabled")
    }

    function loadTemplate(templateName) {
        const template = require(`./templates/${templateName}`);
        templates[templateName] = {
            subject: handlebars.compile(template.subject, {noEscape: true}),
            text: handlebars.compile(template.text, {noEscape: true}),
            html: handlebars.compile(template.html),
        }
        return templates[templateName];
    }

    /**
     * Send an email to a user
     *
     * @param user object - who to send the email to.
     * @param templateName string - name of template to use - from `./templates/`
     * @param context object - object of properties to evaluate the template with
     */
    async function send(user, templateName, context) {
        const template = templates[templateName] || loadTemplate(templateName);
        const templateContext = {user, ...context};

        const mail = {
            to: user.email,
            subject: template.subject(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true}),
            text: template.text(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true}),
            html: template.html(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true})
        }
        if (EMAIL_ENABLED && !process.env.SMTP_DEBUG) {
            mailTransport.sendMail(mail, err => {
                if (err) {
                    app.log.warn("Failed to send email:",err.toString())
                }
            })
        } else {
            app.log.info(`
-----------------------------------
to: ${mail.to}
subject: ${mail.subject}
------
${mail.text}
-----------------------------------`)
        }
    }

    function exportSettings(isAdmin) {
        if (!EMAIL_ENABLED) {
            return false
        } else {
            return isAdmin?exportableSettings:true
        }
    }

    function enabled() {
        return EMAIL_ENABLED
    }

    app.decorate('postoffice', {
        enabled,
        send,
        exportSettings
    });

    next();
});
