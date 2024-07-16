module.exports = {
    subject: 'Password Reset for FlowFuse',
    text:
`Hello

You have requested a password reset on the FlowFuse platform, the following link will let you change your password.

{{{ resetLink }}}

If you have not requested this reset please contact your system administrator.
`,
    html:
`<p>Hello</p>
<p>You have requested a password reset on the FlowFuse platform, the following link will let you change your password.</p>
<p><a href="{{{ resetLink }}}">Reset Password</a></p>
<p>If you have not requested this reset please contact your system administrator.</p>
`
}
