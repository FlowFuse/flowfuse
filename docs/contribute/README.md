## Setup the developer kit for FlowForge

### Mocking email

When developing on FlowForge locally there's no need to configure email. In your
`.env.development` add `SMTP_DEBUG=true`. When an email is send usually, the email
is now printed in the console output in your terminal where you started the
`node` server.
