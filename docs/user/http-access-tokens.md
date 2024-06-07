---
navTitle: HTTP Access Tokens
---

# HTTP Access Tokens

When a FlowFuse instance is secured with [FlowFuse User Authentication](./instance-settings.md#flowfuse-user-authentication),
only users who are in the same FlowFuse team can access the dashboard and HTTP endpoints
created within Node-RED.

In some cases, it is also necessary to provide secure access to the endpoints for other applications to use.
This is where the HTTP Access Tokens can be used.

With the FlowFuse User Authentication option enabled on the Instance's Security settings tab, the table of access
tokens is shown.

### Creating an access token

To create a token, click the Add Token button. Given your token a name and an optional expiry date, then click create.

You will be shown the token value - this is the only time it will be shown so make a note of it before closing the dialog.

![](./images/bearer-token-dialog.png)

### Using an access token

The token can be used when making an HTTP request to the Node-RED instance by providing it in the `Authorization` http header as
a bearer token.

For example, if a Node-RED instance has a flow deployed that includes an `HTTP In` node listening on `/token-demo`, the following
`curl` command can be used to access it:


```shell
curl -H "Authorization: Bearer ffhttp_FKc_S4qlTBV1H411hmhneHcSJ6F_FGNQLPYbnoD3-B0" \
   https://example.flowfuse.cloud/token-demo
```

To access it from another Node-RED instance, you can use the `HTTP Request` node by enabling the 'Use authentication'
option, selecting 'bearer authentication' and providing the token:

![](./images/bearer-token-nr-request.png)
