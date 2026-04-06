// Sent when a SSO Cert will expire in under 2 weeks

// Inserts:
// - name: SSO profile name
// - data: Date of cert Expiry

module.exports = {
    subject: 'FlowFuse SSO Certificate expiring soon',
    text:
`Hello {{{user.name}}},

The certificate for the SSO Profile "{{name}}" will expire
at {{{date}}}.

Please talk to your SSO administrator about issuing a new
certificate for this provider.

Your friendly FlowFuse Team
`,
    html:
`
<p>Hello {{{user.name}}},</p>

<p>The certificate for the SSO Profile "{{name}}" will expire
at {{{date}}}.</p

<p>Please talk to your SSO administrator about issuing a new
certificate for this provider.</p>

<p>Your friendly FlowFuse Team</p>
`
}