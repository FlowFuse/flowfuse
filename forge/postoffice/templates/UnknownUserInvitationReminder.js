module.exports = {
    subject: 'Invitation to collaborate on FlowFuse',
    text:
`Hello!

This is quick reminder that you've been invited to join the FlowFuse platform. Use the link below to sign-up and get started.

This invitation will expire on {{{expiryDate.text}}}.

{{{ signupLink }}}
`,
    html:
`<p>Hello!</p>
<p>This is quick reminder that you've been invited to join the FlowFuse platform. Use the link below to sign-up and get started.</p>
<p>This invitation will expire on {{{expiryDate.html}}}.</p>
<p><a href="{{{ signupLink }}}">Sign Up!</a></p>
`
}
