module.exports = {
    subject: 'Email Change Notification for FlowFuse',
    text:
`Hello

Your Email has been changed on the FlowFuse platform.

* Old email address: {{{ oldEmail }}}
* New email address: {{{ newEmail }}}

If you did not request this, please contact your system administrator.
`,
    html:
`<p>Hello</p>
<p>Your Email has been changed on the FlowFuse platform.</p>
<ul>
<li>Old email address: {{{ oldEmail }}}</li>
<li>New email address: {{{ newEmail }}}</li>
</ul>
<p>If you did not request this, please contact your system administrator.</p>
`
}
