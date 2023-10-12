---
navTitle: Email configuration
---

## Example configuration for common email platforms

### GMail
```yaml
email:
  enabled: true
  debug: false
  smtp:
    host: smtp.gmail.com
    port: 465
    secure: true
    auth:
        user: [USER]@gmail.com
        pass: [PASSWORD]
```

Note: Gmail may require an app specific password to be created if you are using 2FA on the account you can set that up [here](https://security.google.com/settings/security/apppasswords)

### Office365
```yaml
email:
  enabled: true
  debug: false
  smtp:
    host: smtp.office365.com,
    secure: false
    tls:
      ciphers: "SSLv3",
      rejectUnauthorized: false
    auth:
      user: [USERNAME]
      pass: [PASSWORD]
```
