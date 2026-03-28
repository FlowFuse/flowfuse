---
navGroup: FlowFuse Self-Hosted
navTitle: Quick Start
navOrder: 1
meta:
   description: Quickly install FlowFuse in Docker or Kubernetes based environments.
   tags:
     - start
     - quick start
     - quickstart
     - installation
     - flowfuse
     - docker
     - trial license
     - deployment models
---

# Quick Start Guide

This guide provides a streamlined process for setting up and running the FlowFuse platform using [Docker](https://docs.docker.com/get-started/) and [Docker Compose](https://docs.docker.com/compose/). 

The provided Docker Compose file facilitates the deployment of the following services:
* **FlowFuse Platform**: Includes the core application, MQTT broker, and file server for storage
* **Database:** A pre-configured database for storing platform data
* **Proxy Server:** A pre-configured proxy server for managing HTTP traffic

For a full installation guide, including how to setup FlowFuse in a production environment, please refer to the dedicated page for [running FlowFuse on Docker](../install/docker/README.md).

## Prerequisites

Before you begin, ensure you have [Docker](https://docs.docker.com/engine/install/) and [Docker Compose](https://docs.docker.com/compose/install/) (in `2.23.1` version or higher) installed on your system (either as a standalone binary or as docker plugin).

## Step 1: Prepare your domain

FlowFuse requires a domain name to work properly — it uses subdomains to run each Node-RED instance separately, so `localhost` won't work here.

If you own a domain (e.g., `example.com` or `flowfuse.example.com`), create an **A record** pointing to your server's IP address, and another **A record** for the wildcard subdomain (e.g., `*.example.com` or `*.flowfuse.example.com`) pointing to the same address. That's all the setup needed.

If you don't have a domain yet and just want to try FlowFuse locally, see [setting up an alternative to DNS](../install/dns-setup.md#no-local-dns-server).

## Step 2: Download files

```bash
curl -L -o docker-compose.yml https://github.com/FlowFuse/docker-compose/releases/latest/download/docker-compose.yml
curl -L -o .env https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/.env.example
```

## Step 3: Provide domain name

Edit downloaded `.env` file with the editor of your choice and update the `DOMAIN` variable with the domain you will be using for the platform.

You can use `sed` to update the `DOMAIN` variable in the `.env` file:

```bash
sed -i 's/^DOMAIN=.*/DOMAIN=example.com/' .env
```

## Step 4: Start the Application

Run the following command to deploy FlowFuse:

```bash
docker compose up -d
```

This command will download the necessary Docker images, run initial setup and start all the required services in detached mode.

## Step 5: Complete the application Setup

Open your web browser and navigate to `http://forge.<your-domain>/setup` (e.g., `http://forge.example.com/setup`). You will be redirected to the setup page where you can create your admin account and set up your instance.
For detailed information about first setup and configuration, please follow [this guide](../install/first-run.md).


## Cleanup

To stop and remove the FlowFuse application, run the following command:

```bash
docker compose down -v
```

## Troubleshooting

If you encounter any issues, please check the following:

1. Ensure all prerequisites are correctly installed
2. Verify your DNS settings are correct and have propagated
3. Check the Docker logs for any error messages:
   ```bash
   docker compose logs
   ```

For more detailed information or advanced configuration options for running FlowFuse on Docker, please refer to our [full documentation](../install/docker/README.md).