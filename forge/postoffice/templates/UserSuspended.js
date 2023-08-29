module.exports = {
    subject: 'FlowFuse Account Suspended',
    text:
`Hello

Your FlowFuse account has been suspended.

Please contact support via {{{ support }}}

`,
    html:
`<p>Hello</p>
<p>Your FlowFuse account has been suspended.</p>
{{#if url}}
<p>Please contact support via <a href="url.href">{{{ support }}}</a></p>
{{else}}
<p>Please contact support via {{{ support }}}</p>
{{/if}}
`
}
