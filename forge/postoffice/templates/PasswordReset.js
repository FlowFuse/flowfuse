module.exports = {
    subject: 'Password Reset for FlowFuse',
    text:
`Hello

You have requested a password reset on the FlowFuse platform, the following link will let you change your password.

{{{ resetLink }}}

This link will only be valid for 30 minutes from the time it was requested.

If you have not requested this reset please contact your system administrator.
`,
    html:
`<p>Hello</p>
<p>You have requested a password reset on the FlowFuse platform, the following link will let you change your password.</p>
<p><a href="{{{ resetLink }}}">Reset Password</a></p>
<p>This link will only be valid for 30 minutes from the time it was requested.</p>
<p>If you have not requested this reset please contact your system administrator.</p>
`
}
