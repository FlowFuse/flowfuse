const fp = require("fastify-plugin");
const handlebars = require("handlebars");
const nodemailer = require("nodemailer");

const templates = {};

module.exports = fp(async function(app, _opts, next) {

    // transporter = nodemailer.createTransport(require("./localDelivery"));

    let EMAIL_ENABLED = process.env.SMTP_DEBUG || !!process.env.SMTP_TRANSPORT_HOST;
    let transporter = nodemailer.createTransport({
        host: process.env.SMTP_TRANSPORT_HOST,
        port: process.env.SMTP_TRANSPORT_PORT,
        secure: process.env.SMTP_TRANSPORT_PORT === "true",
    });


    const exportableSettings = {
        host: process.env.SMTP_TRANSPORT_HOST,
        port: process.env.SMTP_TRANSPORT_PORT,
        secure: process.env.SMTP_TRANSPORT_PORT === "true",
    }

// console.log({
//     host: process.env.SMTP_TRANSPORT_HOST,
//     port: process.env.SMTP_TRANSPORT_PORT,
//     secure: process.env.SMTP_TRANSPORT_PORT === "true",
// })
    // await transporter.verify();

    // let info = await transporter.sendMail({
    //     from: '"Fred Foo" <foo@example.com>', // sender address
    //     to: "bar@example.com, baz@example.com", // list of receivers
    //     subject: "Hello ✔", // Subject line
    //     text: "Hello world?", // plain text body
    //     html: "<b>Hello world?</b>", // html body
    // });
    // console.log("Message sent: %s", info.messageId);

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
            from: '"FlowForge Platform" <donotreply@flowforge.com>',
            to: user.email,
            subject: template.subject(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true}),
            text: template.text(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true}),
            html: template.html(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true})
        }
        if (EMAIL_ENABLED && !process.env.SMTP_DEBUG) {
            await transporter.sendMail(mail)
        } else {
            console.log(`
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
