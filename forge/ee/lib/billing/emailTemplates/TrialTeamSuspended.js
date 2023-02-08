// Sent when a trial ends without billing setup

// Inserts:
// - username
// - teamSettingsURL

module.exports = {
    subject: 'Your FlowForge trial has ended',
    text:
`Hello {{{username}}},

Your FlowForge trial has now ended. We hope you've enjoyed your time with us.

As we do not have any billing information for your team, we have suspended
your projects.

If you want to restart them you can setup billing on your Team Settings page:

{{{teamSettingsURL}}}

Cheers!

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{username}}},</p>

<p>Your FlowForge trial has now ended. We hope you've enjoyed your time with us.</p>

<p>As we do not have any billing information for your team, we have suspended
your projects.</p>

<p>If you want to restart them you can setup billing on your <a href="{{{teamSettingsURL}}}">Team Settings page</a>.

<p>Cheers!</p>

<p>Your friendly FlowForge Team</p>

`
}
