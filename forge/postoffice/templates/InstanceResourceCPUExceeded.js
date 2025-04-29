module.exports = {
    subject: 'FlowFuse Instance CPU exceeded 75%',
    text:
`Hello {{{ safeName }}},

Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.text }}}" is using more than 75% of its CPU.
This can cause degraded performance, errors, and crashes.

This can occur for a number of reasons including:
- Needing a larger instance size for your workload
- An issue in your flows or functions causing high CPU usage
- An issue in a third-party library or node

Possible solutions:
- Select a larger instance type
- Disabling some nodes to identify a problem area
- Check your flows for loops or functions that are causing high CPU usage
- Check the issue tracker of your contrib nodes
- Check the instance logs for clues and errors

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
`<p>Hello {{{ safeName }}},</p>
<p>
Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.html }}}" is using more than 75% of its CPU.
This can cause degraded performance, errors, and crashes.
</p>

<p>
This can occur for a number of reasons including:
<ul>
<li>Needing a larger instance size for your workload</li>
<li>An issue in your flows or functions holding that are causing high CPU usage</li>
<li>An issue in a third-party library or node</li>
</ul>

Possible solutions:
<ul>
<li>Selecting a larger instance type</li>
<li>Disabling some nodes to identify a problem area</li>
<li>Check your flows for loops or functions that are causing high CPU usage</li>
<li>Check the issue tracker of your contrib nodes</li>
<li>Check the instance logs for clues and errors</li>
</ul>

CTA: <a href="{{{ ctaChangeTypeUrl }}}">Select a larger instance type</a>
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
