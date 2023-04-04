// Inserts:
// - username
// - teamName
// - endingInDuration
// - billingSetup
// - billingUrl

module.exports = {
    subject: 'Your FlowForge trial ends soon',
    text:
`Hello {{{username}}},

Just to let you know, your free trial on team '{{{teamName}}}' ends in {{{endingInDuration}}}.

{{#if billingSetup}}
We can see you have already setup billing on the team - that's great. When
the trial ends we will automatically add any trial projects you have created
to your subscription and you will get charged for them in future invoices.

If you do not want to get charged, then ensure you have either suspended or
deleted the projects before the trial ends.
{{else}}
As you have not yet setup billing on the team, when the trial ends, we will
suspend any trial projects you have created.

If you want them to keep running, please setup billing before the trial ends. You
will only get charged once the trial ends.
{{/if}}

You can mange your team's billing here: {{billingUrl}}

Cheers!

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{username}}},</p>

<p>Just to let you know, your free trial on team '{{{teamName}}}' ends in {{{endingInDuration}}}.</p>

{{#if billingSetup}}
<p>We can see you have already setup billing on the team - that's great. When
the trial ends we will automatically add any trial projects you have created
to your subscription and you will get charged for them in future invoices.</p>

<p>If you do not want to get charged, then ensure you have either suspended or
deleted the projects before the trial ends.</p>
{{else}}
<p>As you have not yet setup billing on the team, when the trial ends, we will
suspend any trial projects you have created.</p>

<p>If you want them to keep running, please setup billing before the trial ends. You
will only get charged once the trial ends.</p>
{{/if}}
</p>

<p>You can mange your team's billing <a href="{{billingUrl}}">here</a></p>

<p>Cheers!</p>

<p>Your friendly FlowForge Team</p>
`
}
