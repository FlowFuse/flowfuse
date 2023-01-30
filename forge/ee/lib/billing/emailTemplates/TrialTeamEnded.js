// Sent when a trial ends with billing setup

// Inserts:
// - username
// - teamName
// - trialProjectName

module.exports = {
    subject: 'Your FlowForge trial has ended',
    text:
`Hello {{{username}}}

Your FlowForge trial has now ended on '{{teamName}}'.
{{#if trialProjectName}}
Your trial project, {{{trialProjectName}}}, has been added to your Team Subscription
and will be included in your next invoice.

If you do not want to be charged for the project you must suspend or delete it via
the Project Settings page.
{{/if}}

We hope you are enjoying your time with us and look forward to seeing what else you
create.

Cheers!

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{username}}}</p>

<p>Your FlowForge trial has now ended on '{{teamName}}'.</p>
{{#if trialProjectName}}
<p>Your trial project, {{{trialProjectName}}}, has been added to your Team Subscription
and will be included in your next invoice.</p>
<p>If you do not want to be charged for the project you must suspend or delete it via
the Project Settings page.</p>
{{/if}}
<p>We hope you are enjoying your time with us and look forward to seeing what else you
create.</p>
<p>Cheers!</p>

<p>Your friendly FlowForge Team</p>

`
}
