## Contributing to FlowForge

This guide will help you get setup to contribute to the FlowForge project.

The core of the FlowForge platform is available under the Apache-2.0 license and
we welcome contributions from the community.

### Software Requirements

This guide assumes you have a working development environment including:

 - Node.js 16
 - Platform build tools
   - Linux: `apt-get install build-essential`
   - MacOS: `xcode-select --install`
   - Windows: installed as part of the official node.js installer
 - Git

### Project Repositories

There are a number of repositories under the [flowforge GitHub organisation](https://github.com/flowforge)
that make up the platform:

Repository    | Description
--------------|---------------------
[flowforge](https://github.com/flowforge/flowforge) | This is the core of the platform.
[forge-ui-components](https://github.com/flowforge/forge-ui-components) | Common UI components used in the forge platform.
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

**Note** If running on MacOS 12.3 or newer you may get an error around node-gyp being unable to build sqllite3.
This is because MacOS no longer includes python2.7.
The solution is to run the command `npm config set python python3` to alias to python3 and then run `npm install` again

By default this will install the latest released versions of the FlowForge components. If
you want to run from the latest source code then you can check out all the required 
projects in the same directory

- flowforge/flowforge
- flowforge/forge-ui-components
- flowforge/flowforge-driver-localfs
- flowforge/flowforge-nr-launcher
- flowforge/flowforge-nr-storage
- flowforge/flowforge-nr-auth
- flowforge/flowforge-nr-audit-logger

Then in the flowforge directory run
```
npm run dev:local
```
This will create all the required symlinks to the relevent projects.

Next in the `forge-ui-components`  directory run
```
npm install
npm run build
```

In the `flowforge-nr-auth` directory run
```
npm install
```

In the `flowforge-nr-audit-logger` directory run
```
npm install
```

In the `flowforge-nr-storage` directory run
```
npm install
```

**Note**: do not check in the modified `package.json` that will be created in the 
`flowforge`, `flowforge-nr-launcher` or `flowforge-driver-localfs` projects.


### Running FlowForge

A number of `npm` tasks are defined in the `package.json` file. To get started from the flowforge directory use:

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

### Testing

Our testing philosophy follows the principle of:

> Write tests. Not too many. Mostly integration [^1]

[^1]: https://kentcdodds.com/blog/write-tests

We create both unit tests and system level tests. The former is suitable for
well-contained components that need to provide a stable api and behaviour to
the rest of the code base. The latter is for testing the external behaviour
of the platform as a whole with as little internal mocking as possible.

We use code coverage reporting as *one* aspect of assessing our testing coverage.
We do not treat 100% coverage as an imperative goal - that can often lead to
busy work writing tests that don't provide any real value in understanding the
overall quality of the system.

Unit tests should provide sufficient coverage to give us confidence that a 
component's behaviour does not unexpectedly change.

We do not *currently* have automated testing capability for the front-end. That
relies on manual verification.

#### Running tests

To run the tests for the project, you can use the following npm tasks:

 - `npm run test` - runs the whole test suite, covering code linting, unit and systems tests.
 - `npm run lint` - runs the linting tests
 - `npm run test:unit` - runs the unit tests
 - `npm run test:system` - runs the system tests

#### Reporting code coverage

The `test:*` tasks have corresponding code coverage tasks. These tasks run the 
tests using `nyc` to generate code coverage information.

 - `npm run cover` - runs the whole test suite (excluding linting) with code 
   coverage enabled and generates a report (via the `cover:report` task)
 - `npm run cover:unit` - runs the unit tests with code coverage enabled. It
  does *not* generate the report.
 - `npm run cover:system` - runs the system tests with code coverage enabled. It
  does *not* generate the report.
 - `npm run cover:report` - generates a report of the code coverage. This is 
  printed to the console and generates a browseable HTML copy under `coverage/index.html`
