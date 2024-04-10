---
navTitle: Monitoring
---

# Platform Monitoring

FlowFuse provides an API end-point that can be used to monitor statistical
information about the platform.

The end-point is accessible to any logged-in Admin user at the url (replace `example.com`
with the domain of your FlowFuse instance)

 - `https://example.com/api/v1/admin/stats`

By default, it returns a JSON object containing key statistics such as the number
of users, instances, and other information.

If the `accept` header of the http request includes `application/openmetrics-text`
then the response is formatted as OpenMetrics text. This can be directly consumed
by tools such as Prometheus.


## Enabling token-based access

In Admin Settings there is an option to allow token-based access to platform statistics.

When enabled, the platform will generate an access token that can be used to access
the end-point without having a full Admin login. This is useful when configuring
tools such as Prometheus to monitor the platform.

1. Under Admin Settings -> General, check the 'allow token-based access' option
2. A dialog is shown containing the token. This is the *only* time the token
   will be shown - make sure you record its value.

The token should be provided as a bearer token in any http request to the end-point;

```bash
TOKEN=your_generated_token
curl -H 'Authorization: Bearer $TOKEN' https://example.com/api/v1/admin/stats
```


