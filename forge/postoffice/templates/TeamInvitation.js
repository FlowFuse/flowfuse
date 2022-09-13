module.exports = {
    subject: 'Invitation to join team {{{invite.team.name}}} on FlowForge',
    text:
`Hello!

You've been invited to join team {{{invite.team.name}}} on the FlowForge platform.

{{{ signupLink }}}
`,
    html:
`<p>Hello!</p>
<p>You've been invited to join team {{invite.team.name}} on the FlowForge platform.</p>
<p><a href="{{{ signupLink }}}">{{{ signupLink }}}</a></p>
`
}
