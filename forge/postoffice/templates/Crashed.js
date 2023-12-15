module.exports = {
    subject: 'FlowFuse instance crashed',
    text:
`Hello

Your FlowFuse Project "{{{ name }}}" has crashed.

You can access the logs here:

{{{ url }}}

`,
    html:
`<p>Hello</p>
<p>Your FlowFuse Project "{{{ name }}}" has crashed</p>

<p>You can access the logs here</p>
<a href="{{{ url }}}">{{{ url }}}</a>
`
}