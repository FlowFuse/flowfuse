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

This version of the FlowFuse platform is intended for running in the Docker Container management system. Typically suited for small/medium on premise deployments.

## Prerequisites

### Platform

The following instructions assume you are running Docker on a Linux or MacOS host system.

#### Digital Ocean

If you are using the Digital Ocean Docker Droplet to host FlowFuse you will need to ensure that port 80 & 443 are opened in the UFW firewall before starting.

```bash
sudo ufw apply http
sudo ufw apply https
```

We have a 1-Click Digital Ocean Droplet that will install and configure FlowFuse for you. Details can be found [here](./digital-ocean.md)

### Docker Compose

FlowFuse uses Docker Compose to install and manage the required components. Instructions on how to install Docker Compose on your system can be found here:

[https://docs.docker.com/compose/install/](https://docs.docker.com/compose/install/)

FlowFuse requires docker-compose v2

### DNS

The orchestration uses an instance of Nginx to route requests to each Node-RED instance. To do this it needs each instance to have a unique hostname, to generate this the instance name is prepended to a supplied domain.

To make this work you will need to configure a DNS server to map a [wildcard domain entry](https://en.wikipedia.org/wiki/Wildcard_DNS_record) to the IP address of the host running Docker. e.g `*.example.com`.

The FlowFuse Application will be hosted on `http://forge.example.com`

**Note** When testing locally you can add entries for each Node-RED instance to your `/etc/hosts` file but you must use the external IP address of the host machine, not the loopback address (`127.0.0.1`).

Notes on how to setup DNS can be found [here](../dns-setup.md).

## Installing FlowFuse

### Download installation files

Download the latest version of the FlowFuse compose file and example `.env` file used for installation configuration:

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


### Using FlowFuse File Storage

Node-RED instances running in Docker do not have direct access to a persistent
file system to store files or use for storing context data.

FlowFuse includes a File Storage service that can be enabled to provide persistent
storage.

#### Disabling the default File nodes

To remove the default Node-RED file nodes from the palette:

1. Edit the Template to add `10-file.js,23-watch.js` to the "Exclude nodes by filename" section

<img src="../images/file-node-template.png" width=500 />


#### Configuring the File Storage service

Full details on configuring the file storage service are available [here](../file-storage/).

#### Enabling the File Storage service

Docker Compose file enables FlowFuse File Storage component by default, no additional actions are required in this area.

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

