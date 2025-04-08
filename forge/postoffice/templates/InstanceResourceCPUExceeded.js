module.exports = {
    subject: 'FlowFuse Instance CPU exceeded 75%',
    text:
`Hello

Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.text }}}" is using more than 75% of its CPU.

This can occur for a number of reasons including:
- incorrect instance size for your workload
- an issue in your flows or functions causing high CPU usage
- an issue in a third-party library or node

Possible solutions:
- upgrading to a larger instance type
- try disabling some nodes to see if the problem settles down after a restart
- check your flows for loops or functions that are causing high CPU usage
- check the issue tracker of your contrib nodes
- check the instance logs for clues and errors

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
`<p>Hello</p>
<p>Your FlowFuse Instance "{{{ name }}}" in Team "{{{ teamName.html }}}" is using more than 75% of its CPU.</p>

<p>
This can occur for a number of reasons including:
<ul>
<li>incorrect instance size for your workload/li>
<li>an issue in your flows or functions holding that are causing high CPU usage/li>
<li>an issue in a third-party library or node/li>
</ul>

Possible solutions:
<ul>
<li>try selecting a larger instance type</li>
<li>try disabling some nodes to see if the problem settles down after a restart</li>
<li>check your flows for loops or functions that are causing high CPU usage</li>
<li>check the issue tracker of your contrib nodes</li>
<li>check the instance logs for clues and errors</li>
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
