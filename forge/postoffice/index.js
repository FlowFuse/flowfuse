const fp = require('fastify-plugin')
const handlebars = require('handlebars')
const nodemailer = require('nodemailer')
const axios = require('axios')

const defaultLayout = require('./layouts/default.js')

const templates = {}

module.exports = fp(async function (app, _opts) {
    let mailTransport
    let exportableSettings = {}
    let EMAIL_ENABLED = app.config.email.enabled
    let poStartupCheck
    
    // Email provider can be either 'standard' (for nodemailer) or 'powerautomate'
    const emailProvider = app.config.email.provider || 'standard'
    
    // PowerAutomate configuration
    const powerAutomate = {
        apiUrl: app.config.email.powerAutomate?.apiUrl || 'https://prod-14.westus.logic.azure.com/your-power-automate-flow-url',
        apiKey: app.config.email.powerAutomate?.apiKey
    }
    
    // Standard configuration (original FlowFuse email)
    const standardConfig = {
        smtp: app.config.email.smtp,
        transport: app.config.email.transport,
        ses: app.config.email.ses
    }
    
    const isConfigured = EMAIL_ENABLED && (
        (emailProvider === 'standard' && (standardConfig.smtp || standardConfig.transport || standardConfig.ses)) ||
        (emailProvider === 'powerautomate' && powerAutomate.apiUrl && powerAutomate.apiKey)
    )
    
    const mailDefaults = { from: app.config.email.from ? app.config.email.from : '"FlowFuse Platform" <donotreply@flowfuse.com>' }
    
    app.addHook('onClose', async (_) => {
        if (poStartupCheck) {
            clearInterval(poStartupCheck)
        }
        if (mailTransport && typeof mailTransport.close === 'function') {
            mailTransport.close()
        }
    })

    // Startup initialisation
    init(false, (err, connected) => {
        if (!err && connected) {
            clearInterval(poStartupCheck)
        }
    })

    if (isConfigured) {
        poStartupCheck = setInterval(() => {
            const notReady = app.config.email.enabled === true && EMAIL_ENABLED === false
            if (notReady) {
                init(true, (err, connected) => {
                    if (!err && connected) {
                        clearInterval(poStartupCheck)
                    }
                })
            } else {
                clearInterval(poStartupCheck)
            }
        }, 1000 * 60 * 5) // check every 5 minutes until successful
    }

    function initStandard(retry, callback) {
        if (retry && mailTransport && typeof mailTransport.close === 'function') {
            mailTransport.close()
        }
        
        if (standardConfig.smtp) {
            const smtpConfig = standardConfig.smtp
            mailTransport = nodemailer.createTransport(smtpConfig, mailDefaults)
            exportableSettings = {
                provider: 'standard',
                host: smtpConfig.host,
                port: smtpConfig.port
            }
            mailTransport.verify(err => {
                if (err) {
                    app.log.error('Failed to verify email connection: %s', err.toString())
                    EMAIL_ENABLED = false
                } else {
                    app.log.info('Connected to SMTP server')
                    EMAIL_ENABLED = true
                }
                callback && callback(err, EMAIL_ENABLED)
            })
        } else if (standardConfig.transport) {
            mailTransport = nodemailer.createTransport(standardConfig.transport, mailDefaults)
            exportableSettings = { provider: 'standard' }
            app.log.info('Email using config provided transport')
            EMAIL_ENABLED = true
            callback && callback(null, EMAIL_ENABLED)
        } else if (standardConfig.ses) {
            const aws = require('@aws-sdk/client-ses')
            const { defaultProvider } = require('@aws-sdk/credential-provider-node')

            const sesConfig = standardConfig.ses

            const ses = new aws.SES({
                apiVersion: '2010-12-01',
                region: sesConfig.region,
                defaultProvider
            })

            if (sesConfig.sourceArn) {
                mailDefaults.ses = {
                    SourceArn: sesConfig.sourceArn,
                    FromArn: sesConfig.FromArn ? sesConfig.FromArn : sesConfig.sourceArn
                }
            }

            mailTransport = nodemailer.createTransport({
                SES: { ses, aws }
            }, mailDefaults)

            exportableSettings = {
                provider: 'standard',
                region: sesConfig.region
            }

            mailTransport.verify(err => {
                if (err) {
                    app.log.error('Failed to verify email connection: %s', err.toString())
                    EMAIL_ENABLED = false
                } else {
                    app.log.info('Connected to AWS SES')
                    EMAIL_ENABLED = true
                }
                callback && callback(err, EMAIL_ENABLED)
            })
        } else {
            app.log.info('Email not configured - no external email will be sent')
            callback && callback(new Error('Email not configured'), false)
        }
    }
    
    function initPowerAutomate(retry, callback) {
        if (powerAutomate.apiUrl && powerAutomate.apiKey) {
            // No direct verification for Power Automate, just validate config presence
            exportableSettings = { 
                provider: 'powerautomate'
            }
            app.log.info('Power Automate email service configured')
            EMAIL_ENABLED = true
            callback && callback(null, EMAIL_ENABLED)
        } else {
            app.log.error('Power Automate email service not properly configured')
            EMAIL_ENABLED = false
            callback && callback(new Error('Power Automate email service not properly configured'), EMAIL_ENABLED)
        }
    }

    function init(retry, callback) {
        if (EMAIL_ENABLED || retry) {
            if (emailProvider === 'standard') {
                initStandard(retry, callback)
            } else if (emailProvider === 'powerautomate') {
                initPowerAutomate(retry, callback)
            } else {
                app.log.error(`Unknown email provider: ${emailProvider}`)
                EMAIL_ENABLED = false
                callback && callback(new Error(`Unknown email provider: ${emailProvider}`), EMAIL_ENABLED)
            }
        } else {
            app.log.info('Email not configured')
            callback && callback(null, EMAIL_ENABLED)
        }
    }

    function loadTemplate(templateName) {
        const template = require(`./templates/${templateName}`)
        registerTemplate(templateName, template)
        return templates[templateName]
    }

    function registerTemplate(templateName, template) {
        templates[templateName] = {
            subject: handlebars.compile(template.subject, { noEscape: true }),
            text: handlebars.compile(template.text, { noEscape: true }),
            html: handlebars.compile(template.html)
        }
    }

    /**
     * Generates email-safe versions (both text and html) of a piece of text.
     * This is intended to make user-provided strings (eg username) that may look
     * like a URL to not looks like a URL to an email client
     * @param {String} value
     */
    function sanitizeText(value) {
        return {
            text: value.replace(/\./g, ' '),
            html: value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\./g, '<br style="display: none;"/>.')
        }
    }
    
    /**
     * Generates email-safe versions (both text and html) of a log array
     * This is intended to make iso time strings and and sanitized log messages
     * @param {Array<{ts: Number, level: String, msg: String}>} log
     */
    function sanitizeLog(log) {
        const isoTime = (ts) => {
            if (!ts) return ''
            try {
                let dt
                if (typeof ts === 'string') {
                    ts = +ts
                }
                // cater for ts with a 4 digit counter appended to the timestamp
                if (ts > 99999999999999) {
                    dt = new Date(ts / 10000)
                } else {
                    dt = new Date(ts)
                }
                let str = dt.toISOString().replace('T', ' ').replace('Z', '')
                str = str.substring(0, str.length - 4) // remove milliseconds
                return str
            } catch (e) {
                return ''
            }
        }
        const htmlEscape = (str) => (str + '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        return {
            text: log.map(entry => {
                return {
                    timestamp: entry.ts ? isoTime(+entry.ts) : '',
                    level: entry.level || '',
                    message: entry.msg || ''
                }
            }),
            html: log.map(entry => {
                return {
                    timestamp: entry.ts ? isoTime(+entry.ts) : '',
                    level: htmlEscape(entry.level || ''),
                    message: htmlEscape(entry.msg || '')
                }
            })
        }
    }

    /**
     * Send an email using standard method (nodemailer)
     */
    async function sendStandard(recipient, subject, textContent, htmlContent) {
        if (!EMAIL_ENABLED || !mailTransport) {
            return
        }
        
        const mail = {
            to: recipient,
            subject: subject,
            text: textContent,
            html: htmlContent
        }
        
        mailTransport.sendMail(mail, err => {
            if (err) {
                app.log.warn(`Failed to send email: ${err.toString()}`)
            }
        })
    }
    
    /**
     * Send an email using Power Automate
     */
    async function sendPowerAutomate(recipient, subject, htmlContent, context) {
        if (!EMAIL_ENABLED || !powerAutomate.apiUrl || !powerAutomate.apiKey) {
            return
        }
        
        try {
            // Format the email according to your schema
            const powerAutomatePayload = {
                to: recipient,
                subject: subject,
                body: htmlContent,
                // Add optional fields if available
                ...(context.cc && { cc: context.cc }),
                ...(context.bcc && { bcc: context.bcc }),
                ...(context.attachments && { attachments: context.attachments })
            };
            
            await axios.post(powerAutomate.apiUrl, powerAutomatePayload, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${powerAutomate.apiKey}`
                }
            });
            app.log.info(`Email sent to ${recipient} via Power Automate`)
        } catch (err) {
            app.log.warn(`Failed to send email via Power Automate: ${err.toString()}`)
        }
    }

    /**
     * Send an email to a user
     *
     * @param user object - who to send the email to.
     * @param templateName string - name of template to use - from `./templates/`
     * @param context object - object of properties to evaluate the template with
     */
    async function send(user, templateName, context) {
        const forgeURL = app.config.base_url
        const template = templates[templateName] || loadTemplate(templateName)
        const templateContext = { forgeURL, user, ...context }
        templateContext.safeName = sanitizeText(user.name || 'user')
        if (templateContext.teamName) {
            templateContext.teamName = sanitizeText(templateContext.teamName)
        }
        if (templateContext.invitee) {
            templateContext.invitee = sanitizeText(templateContext.invitee)
        }
        if (Array.isArray(templateContext.log) && templateContext.log.length > 0) {
            templateContext.log = sanitizeLog(templateContext.log)
        } else {
            delete templateContext.log
        }
        
        const subject = template.subject(templateContext, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true })
        const textContent = template.text(templateContext, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true })
        const htmlContent = defaultLayout(template.html(templateContext, { allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault: true }))
        
        if (EMAIL_ENABLED) {
            if (emailProvider === 'standard') {
                await sendStandard(user.email, subject, textContent, htmlContent)
            } else if (emailProvider === 'powerautomate') {
                await sendPowerAutomate(user.email, subject, htmlContent, context)
            }
        }
        
        if (app.config.email.debug) {
            app.log.info(`
-----------------------------------
to: ${user.email}
subject: ${subject}
provider: ${emailProvider}
------
${textContent}
-----------------------------------`)
        }
    }

    function exportSettings(isAdmin) {
        if (!EMAIL_ENABLED) {
            return false
        } else {
            return isAdmin ? exportableSettings : true
        }
    }

    function enabled() {
        return !!EMAIL_ENABLED
    }

    function getProvider() {
        return emailProvider
    }

    app.decorate('postoffice', {
        enabled,
        send,
        exportSettings,
        registerTemplate,
        getProvider
    })
}, { name: 'app.postoffice' })
