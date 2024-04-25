module.exports = {
    subject: 'Please verify your email address',
    text:
`Hello, {{{safeName.text}}},

Use the link below to verify your email address.

{{{ confirmEmailLink }}}
`,
    html:
`<p>Hello, <b>{{{safeName.html}}}</b>,</p>
<p>Use the link below to verify your email address.</p>
<p><a href="{{{ confirmEmailLink }}}">{{{ confirmEmailLink }}}</a></p>
`
}
