---
navGroup: Overview
navTitle: FlowForge API
---

# FlowForge Platform API

The platform provides a REST API that makes it possible to create integrations and
custom workflows.

The API comes with an OpenAPI 3.0 Specification that can be viewed [here](https://app.flowforge.com/api/),
or on any FlowForge instance on the path `/api/`.

### Accessing the API

Currently, all routes require a valid session cookie to be included in the request.

A [future roadmap item](https://github.com/flowforge/flowforge/issues/14) will
introduce personal access tokens that will make it easier to access the API.

To get a session cookie, the `/account/login` endpoint can be used. The following
command will create a file `cookies.txt` containing the session cookie that can
be used for subsequent requests.

```
curl -X POST -H 'Content-type: application/json' \
     -d '{"username": "USER", "password": "PASSWORD"}' \
     -c cookies.txt \
     http://localhost:3000/account/login
```

Note that if SSO is enabled for this user, this request will fail. The user
will have to login via a browser and extract the cookie value from the browser.


To get the profile of the current logged in user, using the saved cookie file:

```
curl -b cookies.txt \
     -X 'GET' http://localhost:3000/api/v1/user/
```

Alternatively:

```
curl -X 'GET' 'http://localhost:3000/api/v1/user/' \
     -H 'Cookie: sid=<SESSION_TOKEN>'
```



