---
navTitle: Docker install
meta:
   description: Learn how to install FlowFuse using Docker Compose for on-premise deployments. Configure DNS, manage Node-RED instances, and set up HTTPS with Let's Encrypt or wildcard TLS certificates
   tags:
      - docker
      - flowfuse
      - nodered
      - installation
      - dns
      - https
      - nodered
---

# Docker Install

This guide walks you through detailed set up of FlowFuse Platform on a Docker container envoronment using Docker Compose. Typically suited for small/medium on premise deployments.
By the end, you will have a fully functioning FlowFuse instance running in a Docker container.

For a FlowFuse platform evaluation purposes, check out our [Quick Start Guide](../../quick-start/README.md).

## Prerequisites

Before you begin, ensure you have the following:

1. A domain name that you own and can configure DNS settings for (explained in [DNS](#dns))
2. [Docker Engine](https://docs.docker.com/engine/) and [Docker Compose](https://docs.docker.com/compose/install/) installed on your system (either as a standalone binary or as docker plugin)

For a production-ready environment, we also recommend: 
* prepare dedicated database on a external database server (see FAQ for more details)
* prepare TLS certificate for your domain and configure FlowFuse plarform to use it (see [Enable HTTPS](#enable-https-optional))

### DNS

The orchestration uses an instance of Nginx to route requests to each Node-RED instance. To do this it needs each instance to have a unique hostname, to generate this the instance name is prepended to a supplied domain.

To make this work you will need to configure a DNS server to map a [wildcard domain entry](https://en.wikipedia.org/wiki/Wildcard_DNS_record) to the IP address of the host running Docker. e.g `*.example.com`.

The FlowFuse Application will be hosted on `http://forge.example.com`

**Note** At this moment FlowFuse platform is not capable to run on localhost. You must point your domain to the external IP address of the host machine, not the loopback address (`127.0.0.1`).

Notes on how to setup DNS can be found [here](../dns-setup.md).

## Installing FlowFuse

### Download installation files

Download the latest version of the FlowFuse Docker Compose file and example `.env` file used for installation configuration:

```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/docker-compose.yml
curl -o .env https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/.env.example
```

### Configure

Installation configuration is done via the `.env` file.
The minimal configuration required is the domain name you will be using for the platform.

Edit downloaded `.env` file with the editor of your choice and update the `DOMAIN` variable with the domain you will be using for the platform.

Alternatevily, use `sed` to update the `DOMAIN` variable in the `.env` file:

```bash
sed -i 's/^DOMAIN=.*/DOMAIN=example.com/' .env
```

Please note that once set, the `DOMAIN` value should not be changed as it is used as part of the configuration stored in the database of each Node-RED instance. The ability to migrate to different domain is on the feature backlog.

### Enable HTTPS (optional)

If you want to serve the FlowFuse platform and Node-RED instances over TLS you will need to obtain a wildcard TLS certificate for the domain you are using eg `*.example.com`. If you are running on an Internet facing machine you can use our configuration files to generate it atomatically.

Otherwise you will need to contact a SSL Certificate vendor and configure Nginx manually.

#### Automatic TLS Certificate

**Note: Automatic TLS generation is possible only for the publicly available servers**

Download additional Docker Compose file:

```bash
curl -o docker-compose-tls.override.yml https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/docker-compose-tls.override.yml
```

Proceed to the [next paragraph](#start-flowfuse-platform) to start the platform.

#### Custom TLS Certificate

If you have own TLS certificate, you can use it in FlowFuse platform installation as well. As mentioned before, the certificate must be a wildcard one for the domain you are using.

To configure FlowFuse platform with your certificate, you need to have:
* certificate key file
* certificate's full chain (server certificate and intermediate certificates bundled into single file)

To add your certificate to the platform, edit the `.env` file downloaded earlier and set values for `TLS_CERTIFICATE` and `TLS_KEY` variables. `TLS_CERTIFICATE` should contain the full chain of the certificate while `TLS_KEY` should contain the key file.
Example of `.env` file with TLS certificate configuration:

```bash
DOMAIN=example
TLS_CERTIFICATE="
-----BEGIN CERTIFICATE-----
MIIFfzCCBKegAwIBAgISA0
...
-----END CERTIFICATE-----
-----BEGIN CERTIFICATE-----
MIIFfzCCBKegAwIBAgISA0
...
-----END CERTIFICATE-----
"
TLS_KEY="
-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQD
...
-----END PRIVATE KEY-----
"
```

Lastly, download the `docker-compose-tls.override.yml` file:

```bash
curl -o docker-compose-tls.override.yml https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/docker-compose-tls.override.yml
```

## Start FlowFuse platform

**Note: Make sure all configuration are done above before proceeding.**

**Note: Commands must be executed within the same directory where the Docker Compose and `.env` files are located.**

#### With automatic TLS certificate generation

```bash
docker compose -f docker-compose.yml -f docker-compose-tls.override.yml --profile autossl -p flowfuse up -d
```
#### With custom TLS certificate

```bash
docker compose -f docker-compose.yml -f docker-compose-tls.override.yml -p flowfuse up -d
```

#### In all other cases

```bash
docker compose -p flowfuse up -d
```

Visit `forge.example.com` (replace `example.com` with the domain configured in the `.env` file) in your browser to access the FlowFuse platform.


## First Run Setup

The first time you access the platform in your browser, it will take you through
creating an administrator for the platform and other configuration options.

For more information, follow [this guide](../first-run.md).

Once you have finished setting up the admin user there are some Docker specific items to consider.

## Upgrade

1. Find the Docker Compose project name:
    ```bash
    docker compose ls
    ```
    The output will show the project name, as well as the location of Docker Compose file used for creating the project.
2. Stop the existing project (replace `$projectName` with your project name):
   ```bash
   docker compose -p $projectName down --rmi all
   ```
3. Download the latest Docker Compose files:
    ```bash
    curl -o docker-compose.yml https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/docker-compose.yml
    curl -o docker-compose-tls.override.yml https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/docker-compose-tls.override.yml
    ```
4. Make sure the `.env` file is present and contains your installaction-specific configuration
5. Start the project depending on the TLS configuration (replace `$projectName` with your project name):

  - no TLS:
    ```bash
    docker compose -p $projectName up -d
    ```
  - automatic TLS:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose-tls.override.yml --profile autossl -p $projectName up -d
    ```
  - custom TLS:
    ```bash
    docker compose -f docker-compose.yml -f docker-compose-tls.override.yml -p $projectName up -d
    ```

## Common Questions

<!-- ### How to use external database server?

FlowFuse platform uses PostgreSQL database to store its data. By default, the database is created and managed by the Docker Compose. 
If you want to use an external database server, you need to provide the connection details in the `.env` file. -->

### How can I provide my own TLS certificate?

If you have your own TLS certificate, you can use it in FlowFuse platform installation as well. See [Enable HTTPS](#enable-https-optional) section for more details.

### After starting the platform, I can't access it in the browser - I see Connection Refused error

If you are using the Digital Ocean Docker Droplet to host FlowFuse you will need to ensure that port 80 & 443 are opened in the UFW firewall before starting.

FlowFuse platform is running on ports 80 and 443, so you need to open these ports in the firewall. Below are examples of commands to open these ports:

Ubuntu:
```bash
sudo ufw apply http
sudo ufw apply https
```

CentOS:
```bash
sudo firewall-cmd --zone=public --add-service=http --permanent
sudo firewall-cmd --zone=public --add-service=https --permanent
sudo firewall-cmd --reload
```

Windows:
```bash
netsh advfirewall firewall add rule name="Open Port 80" dir=in action=allow protocol=TCP localport=80
netsh advfirewall firewall add rule name="Open Port 443" dir=in action=allow protocol=TCP localport=443
```

### How can I enable persistent storage for Node-RED instances?

Node-RED instances running in Docker do not have direct access to a persistent file system to store files or use for storing context data.

FlowFuse includes a File Storage service that can be enabled to provide persistent storage.

To disable the default File nodes, edit the Template and add `10-file.js,23-watch.js` to the "Exclude nodes by filename" section

<img src="../images/file-node-template.png" width=500 />

FlowFuse Docker Compose files includes FlowFuse File Storage component by default and starts it along with the platform.

Full details on configuring the File Storage service are available [here](../file-storage/).

