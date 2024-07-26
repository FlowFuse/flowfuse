module.exports = {
    subject: 'Invitation to join team {{{teamName.text}}} on FlowFuse',
    text:
`Hello!

You've been invited to join team {{{teamName.text}}} on the FlowFuse platform.

{{{ signupLink }}}
`,
    html:
`<p>Hello!</p>
<p>You've been invited to join team {{{teamName.html}}} on the FlowFuse platform.</p>
<p><a href="{{{ signupLink }}}">Sign Up!</a></p>
`
}
