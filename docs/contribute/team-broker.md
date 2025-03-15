---
navTitle: Team Broker
meta:
  description: How to set up a local instance of EMQX to work with a FlowFuse Development
  tags:
    - flowfuse
    - development
    - contributing
---

# Team Broker configuration

The FlowFuse Team Broker makes use of an EMQX instance.

## Requirement

 - Docker

## Configuration files

Create a directory where the configuration for your broker will live. Create the following three files, with their respective content, in that directory:


cluster.hocon
```
authentication = [
  {
    backend = http
    body {
      clientId = "${clientid}"
      password = "${password}"
      username = "${username}"
    }
    connect_timeout = "15s"
    enable = true
    enable_pipelining = 100
    headers {
      content-type = "application/json"
    }
    mechanism = password_based
    method = post
    pool_size = 8
    request_timeout = "5s"
    ssl {
      ciphers = []
      depth = 10
      enable = false
      hibernate_after = "5s"
      log_level = notice
      reuse_sessions = true
      secure_renegotiate = true
      verify = verify_peer
      versions = [
        "tlsv1.3",
        "tlsv1.2"
      ]
    }
    url = "http://host.docker.internal:3000/api/comms/v2/auth"
  },
  {
    backend = built_in_database
    bootstrap_file = "${EMQX_ETC_DIR}/auth-built-in-db-bootstrap.csv"
    bootstrap_type = plain
    enable = true
    mechanism = password_based
    password_hash_algorithm {name = plain, salt_position = disable}
    user_id_type = username
  }
]
authorization {
  cache {
    enable = true
    excludes = []
    max_size = 32
    ttl = "1m"
  }
  deny_action = ignore
  no_match = allow
  sources = [
    {
      body {
        action = "${action}"
        topic = "${topic}"
        username = "${username}"
      }
      connect_timeout = "15s"
      enable = true
      enable_pipelining = 100
      headers {
        content-type = "application/json"
      }
      method = post
      pool_size = 8
      request_timeout = "30s"
      ssl {
        ciphers = []
        depth = 10
        enable = false
        hibernate_after = "5s"
        log_level = notice
        reuse_sessions = true
        secure_renegotiate = true
        verify = verify_peer
        versions = [
          "tlsv1.3",
          "tlsv1.2"
        ]
      }
      type = http
      url = "http://host.docker.internal:3000/api/comms/v2/acls"
    },
    {   
      enable = false
      path = "data/authz/acl.conf"
      type = file
    }
  ]
}
listeners {
  tcp {
    default {
      acceptors = 16
      access_rules = [
        "allow all"
      ]
      bind = "0.0.0.0:1883"
      enable = true
      enable_authn = true
      max_conn_rate = infinity
      max_connections = infinity
      mountpoint = "${client_attrs.team}"
      proxy_protocol = false
      proxy_protocol_timeout = "3s"
      tcp_options {
        active_n = 100
        backlog = 1024
        buffer = "4KB"
        high_watermark = "1MB"
        keepalive = none
        nodelay = true
        reuseaddr = true
        send_timeout = "15s"
        send_timeout_close = true
      }
      zone = default
    }
  }
  ws {
    default {
      acceptors = 16
      access_rules = [
        "allow all"
      ]
      bind = "0.0.0.0:8083"
      enable = true
      enable_authn = true
      max_conn_rate = infinity
      max_connections = infinity
      mountpoint = "${client_attrs.team}"
      proxy_protocol = false
      proxy_protocol_timeout = "3s"
      tcp_options {
        active_n = 100
        backlog = 1024
        buffer = "4KB"
        high_watermark = "1MB"
        keepalive = none
        nodelay = true
        reuseaddr = true
        send_timeout = "15s"
        send_timeout_close = true
      }
      websocket {
        allow_origin_absence = true
        check_origin_enable = false
        check_origins = "http://localhost:18083, http://127.0.0.1:18083"
        compress = false
        deflate_opts {
          client_context_takeover = takeover
          client_max_window_bits = 15
          mem_level = 8
          server_context_takeover = takeover
          server_max_window_bits = 15
          strategy = default
        }
        fail_if_no_subprotocol = true
        idle_timeout = "7200s"
        max_frame_size = infinity
        mqtt_path = "/"
        mqtt_piggyback = multiple
        proxy_address_header = "x-forwarded-for"
        proxy_port_header = "x-forwarded-port"
        supported_subprotocols = "mqtt, mqtt-v3, mqtt-v3.1.1, mqtt-v5"
        validate_utf8 = true
      }
      zone = default
    }
  }
}
dashboard {
  default_password = topSecret
}
api_key {
  bootstrap_file = "/mounted/config/api-keys"
}
```

acl.conf
```
{allow, {username, {re, "^dashboard$"}}, subscribe, ["$SYS/#"]}.

{allow, {ipaddr, "127.0.0.1"}, all, ["$SYS/#", "#"]}.

{deny, all, subscribe, ["$SYS/#"]}.

{allow, all}.
```

api-keys
```
flowforge:verySecret:administrator
```

## Starting

The following docker command should be run in the directory the configuration files were stored.

```
docker run -d --rm \
  -v $(pwd)/cluster.hocon:/opt/emqx/data/configs/cluster.hocon \
  -v $(pwd)/api-keys:/mounted/config/api-keys \
  -v $(pwd)/acl.conf:/opt/emqx/data/authz/acl.conf \
  --add-host=host.docker.internal:host-gateway \
  -p 1883:1883 -p 8083:8083 -p 18083:18083 --name emqx emqx/emqx:5.8.0
```

## Configuring FlowFuse

Make sure the `broker` section of the `flowfuse.yml` is updated as follows

```
broker:
  url: mqtt://[::1]:1883
  public_url: ws://<ip-of-dev-computer>:8083
  teamBroker:
    enabled: true
```


## Access to the EQMX Dashboard

You can log into the EMQX Dashboard at `http://locahost:18083`

Username: `admin`
Password: `topSecret`