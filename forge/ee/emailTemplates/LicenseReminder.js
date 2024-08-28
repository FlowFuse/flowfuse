// Inserts:
// - user.name
// - forgeURL
// - days

module.exports = {
    subject: 'Your FlowFuse license is about to expire',
    text:
`Hello {{{user.name}}},

This is a friendly reminder that your FlowFuse License will expire in
{{{days}}} days.

You can check the status of your license by logging into your account at
{{{forgeURL}}}.

When your license expires all running instances will be suspended and can
not be restarted until a new license is applied. 

We hope you will get in touch to renew your license and continue to enjoy the 
FlowFuse experience.

Many thanks for your continued service.

Your friendly FlowFuse Team
`,
    html:
`<p>Hello {{{user.name}}},</p>

<p>This is a friendly reminder that your FlowFuse License will expire in
{{{days}}} days.</p>

<p>You can check the status of your license by logging into your account at
{{{forgeURL}}}.</p>

<p>When your license expires all running instances will be suspended and can
not be restarted until a new license is applied.</p>

<p>We hope you will get in touch to renew your license and continue to enjoy the 
FlowFuse experience.</p>

<p>Many thanks for your continued service.</p>

<p>Your friendly FlowFuse Team</p>
`
}
