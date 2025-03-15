module.exports = {
    subject: 'Invitation to join team {{{teamName.text}}} on FlowFuse',
    text:
`Hello!

This is a reminder that you have an invite to join team {{{teamName.text}}} on the FlowFuse platform.

This invitation will expire on {{{expiryDate}}}.

{{{ signupLink }}}
`,
    html:
`<p>Hello!</p>
<p>You've been invited to join team {{{teamName.html}}} on the FlowFuse platform.</p>
<p>This invitation will expire on {{{expiryDate}}}.</p>
<p><a href="{{{ signupLink }}}">Sign Up!</a></p>
`
}
