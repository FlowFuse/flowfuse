// Inserts:
// - user.name
// - forgeURL

module.exports = {
    subject: 'Your FlowForge license has expired',
    text:
`Hello {{{user.name}}},

Your FlowForge License has now expired.

We hope you will get in touch to renew your license and continue to enjoy the 
FlowForge experience.

You can apply a new license by logging into your account at
{{{forgeURL}}}.

Many thanks for your continued service.

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{user.name}}},</p>

<p>Your FlowForge License has now expired.</p>

<p>We hope you will get in touch to renew your license and continue to enjoy the 
FlowForge experience.</p>

<p>You can apply a new license by logging into your account at
{{{forgeURL}}}.</p>

<p>Many thanks for your continued service.</p>

<p>Your friendly FlowForge Team</p>
`
}
