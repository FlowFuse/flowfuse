---
navTitle: Introduction
navOrder: 1
---

# Contributing to FlowFuse

This guide will help you get setup to contribute to the FlowFuse project.

The core of the FlowFuse platform is available under the Apache-2.0 license and
we welcome contributions from the community.

### Software Requirements

This guide assumes you have a working development environment including:

 - Node.js 16
 - Platform build tools
   - Linux: `apt-get install build-essential`
   - MacOS: `xcode-select --install`
   - Windows: installed as part of the official node.js installer
     - ☑️ Automatically install the necessary tools must be checked
 - Git

### Project Repositories

There are a number of repositories under the [FlowFuse GitHub organisation](https://github.com/FlowFuse)
that make up the platform.

Repository    | Description
--------------|---------------------
[FlowFuse](https://github.com/FlowFuse/flowfuse) | This is the core of the platform.
[forge-ui-components](https://github.com/FlowFuse/forge-ui-components) | Common UI components used in the platform.
[installer](https://github.com/FlowFuse/installer) | The installer for the platform
[driver-localfs](https://github.com/FlowFuse/driver-localfs) | The LocalFS driver. This deploys projects to the local system.
[driver-docker](https://github.com/FlowFuse/driver-docker) | The Docker driver. This deploys projects as containers in a Docker-managed environment.
[driver-k8s](https://github.com/FlowFuse/driver-k8s) | The Kubernetes driver. This deploys projects as containers in a Kubernetes-managed environment.
[nr-launcher](https://github.com/FlowFuse/nr-launcher) | The launcher application used to start and monitor an individual instance of Node-RED in the FlowFuse platform. This includes a number of Node-RED plugins used to integrate with the FlowFuse platform.

### Setting Up A Development Environment

With the project split across multiple repositories, setting up a development
environment manually takes quite a lot of steps to ensure everything is checked
out and configured properly.

To make it easier, you can use the [FlowFuse Development Environment](https://github.com/FlowFuse/flowforge-dev-env) project to get set up.

The following steps will get your development environment setup in no time:

```bash
git clone https://github.com/FlowFuse/flowforge-dev-env.git
cd flowforge-dev-env
npm install
npm run init
```

This clones all of the main project repositories, installs their dependencies and builds
the repositories that need it.

All of the repositories are cloned under the `packages` directory:

```txt
flowforge-dev-env
└── packages
    ├── device-agent
    ├── docker-compose
    ├── driver-docker
    ├── driver-k8s
    ├── driver-localfs
    ├── file-server
    ├── flowfuse
    ├── helm
    ├── installer
    ├── nr-file-nodes
    ├── nr-launcher
    └── nr-project-nodes
```

More details on using the FlowForge Development Environment are available in its
[documentation](https://github.com/FlowFuse/flowforge-dev-env).

### FlowFuse Code Structure

The `FlowFuse/flowfuse` repository is the core of the platform and where you'll 
likely want to begin.

```txt
.
├── bin
├── config               - build config files
├── docs
├── etc                  - FlowFuse platform configuration files
├── forge                - Platform core code
│   ├── config
│   ├── containers
│   ├── db
│   ├── ee
│   ├── lib
│   ├── licensing
│   ├── monitor
│   ├── postoffice
│   ├── routes
│   └── settings
├── frontend             - Frontend code
│   ├── dist             - build output - created by `npm run build`
│   ├── public           - static assets
│   └── src              - vue src
│       ├── api
│       ├── components
│       ├── pages
│       ├── routes
│       └── store
├── test                 - tests for FlowFuse
└── var                  - where the database and localfs project directories are created
```

## Development Setup

1. [Create a Stack](#create-a-stack)
1. [Running FlowFuse](#running-flowfuse)
1. [Configuring FlowFuse](#configuring-flowfuse)
1. [Mocking email](#mocking-email)
1. [Testing](#testing)
1. [VSCode Tips](#vscode-tips)


### Create a Stack

You will need to setup the version(s) of Node-RED you want to use in your stacks.

From the `flowfuse` directory run

```bash
npm run install-stack --vers=3.0.2
```

Where `3.0.2` is the version of Node-RED you want to use in the stack.

### Running FlowFuse

A number of `npm` tasks are defined in the `package.json` file of this repository.
To get started from the `flowfuse` directory use:

```bash
npm run serve
```

This does a couple things in parallel:

 - Starts the core FlowFuse application and watches the source code for any
   changes - triggering a restart if needed.
 - Builds the frontend application using WebPack and watches for any changes - triggering a rebuild as needed.


When running like this, the `NODE_ENV` environment variable gets set to `development`.


*Note*: if you have not used the [FlowFuse Development Environment](#setting-up-a-development-environment), then you will need to run `npm run build`
to build the platform before you can use `npm run serve`.


### Configuring FlowFuse

When running in development mode, the core app will use `etc/flowforge.yml` for its configuration.
As you may want to have local configuration that you don't want to commit back to git,
you can create a file called `etc/flowforge.local.yml` and it will use that instead.
That filename is setup to be ignored by git so it won't be accidentally committed.

### Mocking email

If you are developing locally and need to enable external email sending, you can either:

 - Setup a local test SMTP server. For example the Nodemailer project provides a
   useful app that does the job: https://nodemailer.com/app/
 - Alternatively, set the `email.debug` option to `true` in your configuration file
   and the app will print all emails to its log.

### Configuring billing

If you need to develop features covered by the Billing EE feature, you will need
to configure the platform with a set of valid Stripe API keys and an EE license.

The *development-only* EE licence is provided in `flowfuse/forge/licensing/index.js`. This
licence is not valid for production usage.

For FlowForge Inc. employees the configuration is provided in 1Password as 'Stripe Testing Configuration'.

```yaml
license: ***

billing:
  stripe:
    key: ***
    wh_secret: ***
    team_price: ***
    team_product: ***
    project_price: ***
    project_product: ***
    device_price: ***
    device_product: ***
    deviceCost: 10
    new_customer_free_credit: 1000
    teams:
      starter:
        price: ***
        product: ***
        userCost: 0
```

You will also need to install the [Stripe CLI](https://stripe.com/docs/cli/) in order
to handle webhook callbacks properly. Install the CLI following their documentation, then
run the following command, with the API key using the value of `billing.stripe.key` from
above.

```bash
stripe listen --forward-to localhost:3000/ee/billing/callback --api-key ***
```

Note that due to the way Stripe works, you will receive events for *all* activity
in the configured Stripe account. That means if someone else is actively developing
with billing enabled on the same account, you will see their events arrive.

#### Free Trials

Free trials are implemented as a Stripe Credit that is applied when a FlowFuse user
creates their first team and completed billing sign up.

To enable trials, set the `billing.stripe.new_customer_free_credit` value to a credit amount in cents.
For a totally free trial, this amount should match the cost of the Stripe product for the project
type to be trialed to be trialed.

The Stripe webhook forwarder must be running as the credit is handled as part of the webhook handling.

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

#### Running tests

To run the tests for the project, you can use the following npm tasks:

 - `npm run test` - runs the whole test suite, covering code linting, unit and systems tests.
 - `npm run lint` - runs the linting tests
 - `npm run test:unit` - runs the unit tests
 - `npm run test:system` - runs the system tests
 - `npm run test:docs` - checks validity of links in the documentation

##### Testing against PostgreSQL

By default, the tests use an in-memory sqlite database to test against. This is
the most self-contained way of testing the platform. But it is also necessary to
test against PostgreSQL. To enable the use of PostgreSQL in the tests:

1. Ensure you have an instance of PostgreSQL running locally. For example, via docker:
   ```bash
      docker run -it -p 5432:5432 --name ff-postgres -e POSTGRES_PASSWORD=secret postgres:14
   ```

2. Enable PostgreSQL mode by setting the following environment variable:
   ```bash
      export FF_TEST_DB_POSTGRES=true
   ```

   The database connection can be set using the following env vars (default values shown)
   ```bash
      export FF_TEST_DB_POSTGRES_HOST=localhost
      export FF_TEST_DB_POSTGRES_PORT=5432
      export FF_TEST_DB_POSTGRES_USER=postgres
      export FF_TEST_DB_POSTGRES_PASSWORD=secret
      export FF_TEST_DB_POSTGRES_DATABASE=flowforge_test
    ```

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
  printed to the console and generates a browsable HTML copy under `coverage/index.html`

### VSCode Tips

To step debug in VSCode
1. Open `launch.json` config and enter the JavaScript below
2. Choose `Start-Watch` from the "Run and Debug" menu
3. Press ▶️ or <kbd>F5</kbd> to start debugging

There are 2 other "Run and Debug" entries in the menu...
* "Attach by Process ID" - this will allow you to attach to a launched driver
* "Debug Current Test" - this will enable you to step debug a test (starts debugging the currently open test file)

#### 
```json
{
    // Use IntelliSense to learn about possible attributes.
    // Hover to view descriptions of existing attributes.
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "command": "npm run start-watch",
            "name": "Start-Watch",
            "request": "launch",
            "type": "node-terminal",
            "env": {
                "NODE_ENV": "development"
            }
        },
        {
            "name": "Attach by Process ID",
            "processId": "${command:PickProcess}",
            "request": "attach",
            "skipFiles": [
                "<node_internals>/**"
            ],
            "type": "node"
        },
        {
            "type": "node",
            "request": "launch",
            "name": "Debug Current Test",
            "program": "${workspaceFolder}/node_modules/mocha/bin/_mocha",
            "args": [
              "--no-warnings",
              "-u",
              "bdd",// set to bdd, not tdd
              "--timeout",
              "999999",
              "--colors",
              "${file}"
            ],
            "env": {
                "NODE_ENV": "development"
            },
            "internalConsoleOptions": "openOnSessionStart"
        }
    ]
}
```
