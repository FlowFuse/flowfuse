module.exports = {
    subject: 'Invitation for {{{invitee.text}}} to {{{teamName.text}}} not accepted yet',
    text:
`
Hello,

You invited {{{invitee.text}}} to join FlowFuse Team {{{teamName.text}}}, but they have not yet accepted.

This invitation will expire on {{{expiryDate}}}.
`,
    html:
`<p>Hello</p>
<p>You invited {{{invitee.html}}} to join FlowFuse Team {{{teamName.html}}}, but they have not yet accepted.</p>
<p>This invitation will expire on {{{expiryDate}}}.</p>
`
}
