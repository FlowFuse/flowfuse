module.exports = {
    subject: 'Invitation to join team {{{invite.team.name}}} on FlowFuse',
    text:
`Hello!

You've been invited to join team {{{invite.team.name}}} on the FlowFuse platform.

{{{ signupLink }}}
`,
    html:
`<p>Hello!</p>
<p>You've been invited to join team {{invite.team.name}} on the FlowFuse platform.</p>
<p><a href="{{{ signupLink }}}">Sign Up!</a></p>
`
}
