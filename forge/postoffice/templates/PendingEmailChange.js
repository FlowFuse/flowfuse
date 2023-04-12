module.exports = {
    subject: 'Please confirm your email change request on FlowForge',
    text:
`Hello

A request to change your Email Address has been made on the FlowForge platform.

* Old email address: {{{ oldEmail }}}
* New email address: {{{ newEmail }}}

Please click the following link to confirm this change:
{{{ confirmEmailLink }}}

NOTE: You will need to log in with your original User ID or Email Address and Password to validate the change.

If you did not request this, please ignore this Email.
If this continues to occur, contact your system administrator.
`,
    html:
`<p>Hello</p>
<p>A request to change your Email Address has been made on the FlowForge platform.</p>
<ul>
<li>Old email address: {{{ oldEmail }}}</li>
<li>New email address: {{{ newEmail }}}</li>
</ul>
<p>Please click the following link to confirm this change:
    <a href="{{{ confirmEmailLink }}}">{{{ confirmEmailLink }}}</a>
</p>
<p>NOTE: You will need to log in with your original User ID or Email Address and Password to validate the change.</p>
<p>&nbsp;</p>
<p>If you did not request this, please ignore this Email.</p>
<p>If this continues to occur, contact your system administrator.</p>
`
}
