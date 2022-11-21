module.exports = {
    subject: 'Username Change Notification for FlowForge',
    text:
`Hello

Your Username has been changed on the FlowForge platform.

* Old username: {{{ oldUsername }}}
* New username: {{{ newUsername }}}

If you did not request this, please contact your system administrator.
`,
    html:
`<p>Hello</p>
<p>Your Username has been changed on the FlowForge platform.</p>
<ul>
<li>Old username: {{{ oldUsername }}}</li>
<li>New username: {{{ newUsername }}}</li>
</ul>
<p>If you did not request this, please contact your system administrator.</p>
`
}
