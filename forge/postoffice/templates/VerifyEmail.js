module.exports = {
    subject: 'Please verify your email address',
    text:
`Hello, {{{safeName.text}}},

Please use this code to verify your email address:

{{{ token.token }}}

Do not share this code with anyone else.

This token will expire in 30 minutes.
`,
    html:
`<p>Hello, <b>{{{safeName.html}}}</b>,</p>
<p>Please use this code to verify your email address:</p>
<p><b>{{{ token.token }}}</b></p>
<p>Do not share this code with anyone else.</p>
<p>This token will expire in 30 minutes.</p>
`
}
