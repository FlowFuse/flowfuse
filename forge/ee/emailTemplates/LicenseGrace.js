// Inserts:
// - user.name
// - forgeURL
// - days

module.exports = {
    subject: 'Your FlowForge license has entered the grace period',
    text:
`Hello {{{user.name}}},

This is a friendly reminder that your FlowForge License has expired
and has entered the grace period which will end in {{{days}}} days.

You can check the status of your license by logging into your account at
{{#if forgeURL}}{{{forgeURL}}}{{else}}https://flowforge.com{{/if}}.

We hope you will get in touch to renew your license and continue to enjoy the 
FlowForge experience.

Many thanks for your continued service.

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{user.name}}},</p>

<p>This is a friendly reminder that your FlowForge License has expired
and has entered the grace period which will end in {{{days}}} days.</p>

<p>You can check the status of your license by logging into your account at
{{#if forgeURL}}{{{forgeURL}}}{{else}}https://flowforge.com{{/if}}.</p>

<p>We hope you will get in touch to renew your license and continue to enjoy the 
FlowForge experience.</p>

<p>Many thanks for your continued service.</p>

<p>Your friendly FlowForge Team</p>
`
}
