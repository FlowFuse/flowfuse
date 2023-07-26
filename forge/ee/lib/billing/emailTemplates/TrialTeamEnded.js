// Sent when a trial ends with billing setup

// Inserts:
// - username
// - teamName

module.exports = {
    subject: 'Your FlowForge trial has ended',
    text:
`Hello {{{username}}},

Your FlowForge trial has now ended on '{{teamName}}'.

We hope you are enjoying your time with us and look forward to seeing what else you
create.

Cheers!

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{username}}},</p>

<p>Your FlowForge trial has now ended on '{{teamName}}'.</p>
<p>We hope you are enjoying your time with us and look forward to seeing what else you
create.</p>
<p>Cheers!</p>

<p>Your friendly FlowForge Team</p>

`
}
