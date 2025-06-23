module.exports = {
    subject: 'FlowFuse Instance crashed',
    text:
`Hello {{{ safeName.text }}},

Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.text }}}" has crashed due to an uncaught exception.

This can occur for a number of reasons including:
- Needing a larger instance size for your workload
- An issue in your flows or function nodes
- An issue in a third-party contribution node
- An issue in Node-RED itself

Possible solutions:
- Upgrade to a larger instance type
- Look out for async function calls in your function nodes that don't have error handling
- Check the issue tracker of the node that caused the crash
- Check the Node-RED issue tracker for similar issues

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
<p>Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.html }}}" has crashed due to an uncaught exception.</p>

<p>
This can occur for a number of reasons including:
<ul>
<li>Needing a larger instance size for your workload</li>
<li>An issue in your flows or function nodes</li>
<li>An issue in a third-party contribution node</li>
<li>An issue in Node-RED itself</li>
</ul>

Possible solutions:
<ul>
<li>Upgrade to a larger instance type</li>
<li>Look out for async function calls in your function nodes that don't have error handling</li>
<li>Check the issue tracker of the node that caused the crash</li>
<li>Check the Node-RED issue tracker for similar issues</li>
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
