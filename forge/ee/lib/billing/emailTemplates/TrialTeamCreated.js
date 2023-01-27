// Inserts:
// - username
// - teamName
// - trialDuration
// - trialProjectTypeName

module.exports = {
    subject: 'Welcome to your free FlowForge trial',
    text:
`Hello {{{username}}}

Welcome to your FlowForge trial. We've created a team called {{{teamName}}} just
for you.

Your trial will last for {{{trialDuration}}} days and you'll be able to create
a {{{trialProjectTypeName}}} project for free.

Once the trial ends, you can setup billing details on your team to keep the project
running. But do not worry - we'll let you know when the trial is nearing its end so you
can choose what to do nearer the time.

If you want to do more with your team during the trial, you will need to setup
billing details. You will still get your one {{{trialProjectTypeName}}} project
for free during the trial and we will only add it to your billing subscription
once the trial ends. Again, we'll email to let you know what is happening so
you can cancel at any time.

Cheers!

Your friendly FlowForge Team
`,
    html:
`<p>Hello {{{username}}}</p>

<p>Welcome to your FlowForge trial. We've created a team called {{{teamName}}} just
for you.</p>

<p>Your trial will last for {{{trialDuration}}} days and you'll be able to create
a {{{trialProjectTypeName}}} project for free.</p>

<p>Once the trial ends, you can setup billing details on your team to keep the project
running. But do not worry - we'll let you know when the trial is nearing its end so you
can choose what to do nearer the time.</p>

<p>If you want to do more with your team during the trial, you will need to setup
billing details. You will still get your one {{{trialProjectTypeName}}} project
for free during the trial and we will only add it to your billing subscription
once the trial ends. Again, we'll email to let you know what is happening so
you can cancel at any time.</p>

<p>Cheers!</p>

<p>Your friendly FlowForge Team</p>
`
}
