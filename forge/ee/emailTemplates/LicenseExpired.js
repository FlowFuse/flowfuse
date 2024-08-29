// Inserts:
// - user.name
// - forgeURL

module.exports = {
    subject: 'Your FlowFuse license has expired',
    text:
`Hello {{{user.name}}},

Your FlowFuse License has now expired.

All running instances have been suspended and can not be restarted until 
a new license is applied.

We hope you will get in touch to renew your license and continue to enjoy the 
FlowFuse experience.

You can apply a new license by logging into your account at
{{{forgeURL}}}.

Many thanks for your continued service.

Your friendly FlowFuse Team
`,
    html:
`<p>Hello {{{user.name}}},</p>

<p>Your FlowFuse License has now expired.</p>

<p>All running instances have been suspended and can not be restarted until 
a new license is applied.</p>

<p>We hope you will get in touch to renew your license and continue to enjoy the 
FlowFuse experience.</p>

<p>You can apply a new license by logging into your account at
{{{forgeURL}}}.</p>

<p>Many thanks for your continued service.</p>

<p>Your friendly FlowFuse Team</p>
`
}
