---
navGroup: FlowFuse User Manuals
navOrder: 2
navTitle: FlowFuse API
meta:
  description: Explore the FlowFuse Platform API, a RESTful interface that facilitates custom integrations, workflows, and interactions.
---

# FlowFuse Platform API

The platform provides a REST API that makes it possible to create integrations and
custom workflows.

The API comes with an OpenAPI 3.0 Specification that can be viewed [here](https://app.flowfuse.com/api/),
or on any FlowFuse instance on the path `/api/`.

### Accessing the API

To make use of the API you will need a valid Access Token. Tokens can be generated 
for a user under the Security section of the User Settings page.

![Tokens Settings Page](images/tokens.png)

Tokens can be set to have a limited life or unlimited and can be revoked
by deleting the token from the list. Tokens with an expiry date will be deleted once they reach that date.

Be aware that the token value will only be displayed once, at creation time,
there is no way to recover the token after this point.

Currently, all routes require a valid token to be included in the request.

The tokens are passed using the `Authorization` header as a `Bearer` token.


For example, the following will get a list of the token owner's teams:

```
curl -H "Authorization: Bearer ffpat_d4vZlLhCN8muyFUi6UsquLj47H2aTDkDpvxBUf5Ea" \
     https://app.flowforge.com/api/v1/user/teams
```

When sending data to the API, requests must set the `Content-Type` header to `application/json`.

For example, the following will update the name of the team with an id of `mNYLkklLAG`:

```
curl -X PUT \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer ffpat_d4vZlLhCN8muyFUi6UsquLj47H2aTDkDpvxBUf5Ea" \
     -d '{"name": "My Development Team"}' \
     https://app.flowforge.com/api/v1/teams/mNYLkklLAG
```
