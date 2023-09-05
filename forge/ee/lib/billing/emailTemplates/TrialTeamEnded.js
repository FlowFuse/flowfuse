// Sent when a trial ends with billing setup

// Inserts:
// - username
// - teamName

module.exports = {
    subject: 'Your FlowFuse trial has ended',
    text:
`Hello {{{username}}},

Your FlowFuse trial has now ended on '{{teamName}}'.

We hope you are enjoying your time with us and look forward to seeing what else you
create.

Cheers!

Your friendly FlowFuse Team
`,
    html:
`<p>Hello {{{username}}},</p>

<p>Your FlowFuse trial has now ended on '{{teamName}}'.</p>
<p>We hope you are enjoying your time with us and look forward to seeing what else you
create.</p>
<p>Cheers!</p>

<p>Your friendly FlowFuse Team</p>

`
}
