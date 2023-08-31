// Inserts:
// - username
// - teamName
// - trialDuration
// - trialProjectTypeName

module.exports = {
    subject: 'Welcome to your free FlowFuse trial',
    text:
`Hello {{{username}}},

Welcome to FlowFuse. We hope you enjoy your free trial for your first
{{{trialDuration}}} days with us.

To get started, log in to FlowFuse and begin creating Node-RED flows in your first application.

You can also invite other users to join your team to collaborate on your applications.

{{#if trialProjectTypeName}}
Your {{{trialDuration}}} day trial allows you to create a {{{trialProjectTypeName}}} instance
for free. Once the trial ends, you will need to add your credit card details to
keep it running. But don't worry - we'll remind you when the trial is
nearing its end.

If you want to do more with your team during the trial, you can add your credit
card details at any time and create more instances.  Again, we'll email to remind
you what is happening with the trial.
{{else}}
Your {{{trialDuration}}} day trial gives you full access to your new Starter team,
where you can have up to two Node-RED instances and two devices.

Once the trial ends, you will need to add your credit card details to keep it running.
But don't worry - we'll remind you when the trial is nearing its end.
{{/if}}
We hope you enjoy the FlowFuse experience.

Cheers!

Your friendly FlowFuse Team
`,
    html:
`<p>Hello {{{username}}},</p>

<p>Welcome to FlowFuse. We hope you enjoy your free trial for your first
{{{trialDuration}}} days with us.</p>

<p>To get started, log in to FlowFuse and begin creating Node-RED flows in your first application.</p>

<p>You can also invite other users to join your team to collaborate on your applications.</p>

{{#if trialProjectTypeName}}
<p>Your {{{trialDuration}}} day trial allows you to create a {{{trialProjectTypeName}}} instance
for free. Once the trial ends, you will need to add your credit card details to
keep it running. But don't worry - we'll remind you when the trial is
nearing its end.</p>

<p>If you want to do more with your team during the trial, you can add your credit
card details at any time and create more instances.  Again, we'll email to remind
you what is happening with the trial.</p>
{{else}}
<p>Your {{{trialDuration}}} day trial gives you full access to your new Starter team,
where you can have up to two Node-RED instances and two devices.</p>

<p>Once the trial ends, you will need to add your credit card details to keep it running.
But don't worry - we'll remind you when the trial is nearing its end.</p>
{{/if}}

<p>We hope you enjoy the FlowFuse experience.</p>

<p>Cheers!</p>

<p>Your friendly FlowFuse Team</p>
`
}
