## Contributing to FlowForge

This guide will help you get setup to contribute to the FlowForge project.

The core of the FlowForge platform is available under the Apache-2.0 license and
we welcome contributions from the community.

### Software Requirements

This guide assumes you have a working development environment including:

 - Node.js 16
 - Platform build tools
   - Linux: `apt-get install built-essential`
   - MacOS: `xcode-select --install`
   - Windows: installed as part of the official node.js installer
 - Git

### Project Repositories

There are a number of repositories under the [flowforge GitHub organisation](https://github.com/flowforge)
that make up the platform:

Repository    | Description
--------------|---------------------
[flowforge](https://github.com/flowforge/flowforge) | This is the core of the platform.
[installer](https://github.com/flowforge/installer) | The installer for the platform
[flowforge-driver-localfs](https://github.com/flowforge/flowforge-driver-localfs) | The LocalFS driver. This deploys projects to the local system.
[flowforge-driver-docker](https://github.com/flowforge/flowforge-driver-docker) | The Docker driver. This deploys projects as containers in a Docker-managed environment.
[flowforge-driver-k8s](https://github.com/flowforge/flowforge-driver-k8s) | The Kubernetes driver. This deploys projects as containers in a Kubernetes-managed environment.
[flowforge-nr-launcher](https://github.com/flowforge/flowforge-nr-launcher) | The launcher application used to start and monitor an individual instance of Node-RED in the FlowForge platform.
[flowforge-nr-audit-logger](https://github.com/flowforge/flowforge-nr-audit-logger) | A Node-RED logging plugin that captures audit log events and sends them back to the FlowForge platform.
[flowforge-nr-auth](https://github.com/flowforge/flowforge-nr-auth) | A Node-RED authentication plugin that controls access to a Node-RED instance based on FlowForge access controls.
[flowforge-nr-storage](https://github.com/flowforge/flowforge-nr-storage) | A Node-RED storage plugin that stores Node-RED state in the FlowForge platform



The `flowforge/flowforge` repository is the core of the platform and where you'll likely
want to begin.

### FlowForge Code Structure

```
/
├── config   - developer tools configuration files  
├── docs     - documentation
├── etc      - runtime configuration files
├── forge    - the core platform application
├── frontend - the frontend source code
└── test     - test material
```

### Installing code dependencies


After cloning the core repository, you will need to install the dependencies by running
```
npm install
```

### Running FlowForge

A number of `npm` tasks are defined in the `package.json` file. To get started use:

```
npm run serve
```

This does a couple things in parallel:

 - Starts the core FlowForge application and watches the source code for any
   changes - triggering a restart if needed.
 - Builds the frontend application using WebPack and watches for any changes - triggering a rebuild as needed.


When running like this, the `NODE_ENV` environment variable gets set to `development`.

### Configuring FlowForge

When running in this mode, the core app will use `etc/flowforge.yml` for its configuration.
As you may want to have local configuration that you don't want to commit back to git,
you can create a file called `etc/flowforge.local.yml` and it will use that instead.
That filename is setup to be ignored by git so it won't be accidentally committed.

### Mocking email

If you are developing locally and need to enable external email sending, you can either:

 - Setup a local test SMTP server. For example the Nodemailer project provides a
   useful app that does the job: https://nodemailer.com/app/
 - Alternatively, set the `email.debug` option to `true` in your configuration file
   and the app will print all emails to its log.
