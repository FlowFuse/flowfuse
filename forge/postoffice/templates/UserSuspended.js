module.exports = {
    subject: 'FlowForge Account Suspended',
    text:
`Hello

Your FlowForge account has been suspended.

{{#if reason}}
{{ reason }}
{{/if}}

Please contact support

`,
    html:
`<p>Hello</p>
<p>Your FlowForge account has been suspended.</p>
{{#if reason}}
<p>{{{ reason }}}</p>
{{/if}}
<p>Please contact support</p>
`
}
