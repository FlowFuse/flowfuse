module.exports = {
    subject: 'Please verify your email address',
    text:
`Hello, {{{user.name}}},

Use the link below to verify your email address.

{{{ confirmEmailLink }}}
`,
    html:
`<p>Hello, <b>{{user.name}}</b>,</p>
<p>Use the link below to verify your email address.</p>
<p><a href="{{{ confirmEmailLink }}}">{{{ confirmEmailLink }}}</a></p>
`
}
