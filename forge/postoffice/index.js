const fp = require("fastify-plugin");
const handlebars = require("handlebars");

const templates = {};

module.exports = fp(async function(app, _opts, next) {
    const nodemailer = require("nodemailer");

    let transporter = nodemailer.createTransport({
        host: "localhost",
        port: 1025,
        secure: false, // true for 465, false for other ports
    });
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
            subject: handlebars.compile(template.subject),
            text: handlebars.compile(template.text),
            html: handlebars.compile(template.html),
        }
        return templates[templateName];
    }

    const postoffice = {
        send: async function(user, templateName, context) {
            const template = templates[templateName] || loadTemplate(templateName);
            const templateContext = {user,context};

            const mail = {
                from: '"FlowForge Platform" <donotreply@flowforge.com>',
                to: user.email,
                subject: template.subject(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true}),
                text: template.text(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true}),
                html: template.html(templateContext,{allowProtoPropertiesByDefault: true, allowProtoMethodsByDefault:true})
            }
            await transporter.sendMail(mail)
        }
    }
    app.decorate('postoffice', postoffice);
    next();
});
