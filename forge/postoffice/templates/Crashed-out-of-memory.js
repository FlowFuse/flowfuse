module.exports = {
    subject: 'FlowFuse Instance crashed',
    text:
`Hello {{{ safeName.text }}},

Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.text }}}" has crashed due to an out of memory error.

This can occur for a number of reasons including:
- Needing a larger instance size for your workload
- An issue in your flows or functions holding onto memory
- An issue in a third-party library or node

Possible solutions:
- Upgrade to a larger instance type
- Disabling some nodes to identify a problem area
- When polling external services, ensure you are not polling too frequently as this may cause backpressure leading to memory exhaustion
- Check your flows for large data structures being held in memory, particularly in context
- Check the issue tracker of your contrib nodes

Upgrade my instance: {{{ ctaChangeTypeUrl }}}

{{#if log.text}}
------------------------------------------------------
Logs:

{{#log.text}}
Timestamp: {{{timestamp}}}
Severity: {{{level}}}
Message: {{{message}}}

{{/log.text}}

Note: Timestamps in this log are in UTC (Coordinated Universal Time).
------------------------------------------------------
{{/if}}

You can access the instance and its logs here:

{{{ url }}}

`,
    html:
`<p>Hello {{{ safeName.html }}},</p>
<p>Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.html }}}" has crashed due to an out of memory error.</p>

<p>
This can occur for a number of reasons including:
<ul>
<li>Needing a larger instance size for your workload</li>
<li>An issue in your flows holding onto memory</li>
<li>An issue in a third-party library or node</li>
</ul>

Possible solutions:
<ul>
<li>Upgrade to a larger instance type</li>
<li>Disabling some nodes to identify a problem area</li>
<li>When polling external services, ensure you are not polling too frequently as this may cause backpressure leading to memory exhaustion</li>
<li>Check your flows for large data structures being held in memory, particularly in context</li>
<li>Check the issue tracker of your contrib nodes</li>
</ul>

CTA: <a href="{{{ ctaChangeTypeUrl }}}">Upgrade my instance</a>
</p>


{{#if log.html}}
<p>
Logs:
<table style="width: 100%; font-size: small; font-family: monospace; white-space: pre;">
    <tr>
        <th style="text-align: left; min-width: 135px;">Timestamp</th>
        <th style="text-align: left; white-space: nowrap;">Severity</th>
        <th style="text-align: left;">Message</th>
    </tr>
    {{#log.html}}
    <tr>
        <td style="vertical-align: text-top;">{{{timestamp}}}</td>
        <td style="vertical-align: text-top;">{{{level}}}</td>
        <td>{{{message}}}</td>
    </tr>
    {{/log.html}}
</table>
<i>Note: Timestamps in this log are in UTC (Coordinated Universal Time).</i>
</p>
{{/if}}

<p>You can access the instance and its logs here</p>
<a href="{{{ url }}}">Instance Logs</a>
`
}
