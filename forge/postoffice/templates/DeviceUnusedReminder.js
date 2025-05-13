module.exports = {
    subject: "Your remote instance '{{{ deviceName.text }}}' is ready to be connected...!",
    text:
`Hello {{{ safeName.text }}},

Congratulations on creating your remote instance '{{{ deviceName.text }}}' which you can see here: {{{ url }}}!

To access the editor for this instance, you will need to install the Device Agent and connect it to the platform.

The documentation at https://flowfuse.com/docs/device-agent/quickstart/ will guide you through the process (it contains a video walkthrough as well).

{{#if support}}
If you have trouble with any part of the setup process, feel free to contact support via {{{ support }}}
{{else}}
If you have trouble with any part of the setup process, contact support.
{{/if}}

Best regards,

The FlowFuse Team
`,
    html:
`<p>Hello {{{ safeName.html }}},</p>
<p>Congratulations on creating your remote instance <a href="{{{ url }}}">"{{{ deviceName.html }}}"</a>!</p>
<p>To access the editor for this instance, you will need to install the Device Agent and connect it to the platform.</p>
<p>The <a href="https://flowfuse.com/docs/device-agent/quickstart/">quick start documentation</a> can guide you through the process (it contains a video walkthrough as well).</p>
{{#if support}}
<p>If you have trouble with any part of the setup process, feel free to <a href="{{{ support }}}">contact support</a>.</p>
{{else}}
<p>If you have trouble with any part of the setup process, contact support.</p>
{{/if}}
<p></p>
<p>Best regards,<br>
The FlowFuse Team</p>
`
}
