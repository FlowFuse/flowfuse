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

This guide will help you quickly set up and run FlowFuse platform using Docker and docker-compose.

## Prerequisites

Before you begin, ensure you have the following:

1. A domain name that you own and can configure DNS settings for (explained in step 1)
2. Docker and Docker Compose installed on your system (either as a standalone binary or as docker plugin)

## Step 1: Configure DNS

Before running the FlowFuse, you need to configure your fully qualified domain name settings:

1. Point your main domain (e.g., `example.com`) to your server's IP address (this works with subdomain as well e.g. `flowfuse.example.com).
2. Set up a wildcard DNS record (e.g., `*.example.com`) to point to your server's IP address.

This step is crucial for the proper functioning of the application. FlowFuse will not run properly on `localhost` domain.

## Step 2: Download Compose file

```bash
curl -o docker-compose.yml https://raw.githubusercontent.com/FlowFuse/docker-compose/refs/heads/main/docker-compose-quick-start.yml
```

## Step 3: Start the Application

Run the following command to deploy FlowFuse. Replace the  `yourdomain.com` with your domain name configured in step 1.:

```bash
DOMAIN=example.com docker compose -p flowfuse up -d
```

This command will download the necessary Docker images, run initial setup and start all the required services in detached mode.

## Step 4: Complete the application Setup

Open your web browser and navigate to `http://forge.example.com/setup` . You will be redirected to the setup page where you can create your admin account and set up your instance.
For detailed information about first setup and configuration, please follow [this guide](../install/first-run.md).


## Cleanup

To stop and remove the FlowFuse application, run the following command. Replace `yourdomain.com` with your domain name:

```bash
DOMAIN=example.com docker compose -p flowfuse down -v
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