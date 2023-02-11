// Inserts:
// - username
// - teamName
// - trialDuration
// - trialProjectTypeName

module.exports = {
    subject: 'Welcome to your free FlowForge trial',
    text:
`Hello {{{username}}},

Welcome to FlowForge. We hope you enjoy your free trial for your first
{{{trialDuration}}} days with us.

To get started using FlowForge, log in to your new team, '{{{teamName}}}' 
and create your first Node-RED Project.

You can also invite other users to join your team to collaborate on your projects.

Your {{{trialDuration}}} day trial allows you to create a {{{trialProjectTypeName}}} project
for free. Once the trial ends, you will need to add your credit card details to
keep the project running. But don't worry - we'll remind you when the trial is
nearing its end.

If you want to do more with your team during the trial, you can add your credit
card details at any time and create more projects.  Again, we'll email to remind
you what is happening with the trial.

We hope you enjoy the FlowForge experience.

Cheers!

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{username}}},</p>

<p>Welcome to FlowForge. We hope you enjoy your free trial for your first
{{{trialDuration}}} days with us.</p>

<p>To get started using FlowForge, log in to your new team, '{{{teamName}}}' 
and create your first Node-RED Project.</p>

<p>You can also invite other users to join your team to collaborate on your projects.</p>

<p>Your {{{trialDuration}}} day trial allows you to create a {{{trialProjectTypeName}}} project
for free. Once the trial ends, you will need to add your credit card details to
keep the project running. But don't worry - we'll remind you when the trial is
nearing its end.</p>

<p>If you want to do more with your team during the trial, you can add your credit
card details at any time and create more projects.  Again, we'll email to remind
you what is happening with the trial.</p>

<p>We hope you enjoy the FlowForge experience.</p>

<p>Cheers!</p>

<p>Your friendly FlowForge Team</p>
`
}
