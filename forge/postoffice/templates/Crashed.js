module.exports = {
    subject: 'FlowFuse Instance crashed',
    text:
`Hello

Your FlowFuse Instance "{{{ name }}}" has crashed.

You can access the logs here:

{{{ url }}}

`,
    html:
`<p>Hello</p>
<p>Your FlowFuse Instance "{{{ name }}}" has crashed</p>

<p>You can access the logs here</p>
<a href="{{{ url }}}">Instance Logs</a>
`
}
