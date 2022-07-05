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
     - ☑️ Automatically install the necessary tools must be checked
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
.
├── bin
├── config               - build config files
├── docs
├── etc                  - FlowForge platform configuration files
├── forge
│   ├── config
│   ├── containers
│   │   └── node_modules
│   │        └── @flowforge
│   ├── db
│   │   ├── controllers
│   │   ├── models
│   │   └── views
│   ├── licensing
│   ├── postoffice
│   ├── routes
│   │   ├── api
│   │   ├── auth
│   │   ├── logging
│   │   ├── setup
│   │   ├── storage
│   │   └── ui
│   └── settings
├── frontend             - the forge frontend
│   ├── dist             - build output - created by `npm run build`
│   ├── public           - static assets
│   └── src              - vue src
│       ├── api
│       ├── components
│       ├── pages
│       │   └── account
│       ├── routes
│       └── store
├── test                 - tests for FlowForge
└── var                  - where the database and localfs project directories are created
```
### Instructions
1. [Clone the repository](#clone-the-flowforgeflowforge-repository)
1. [Install dependencies](#install-flowforgeflowforge-dependencies)
1. [Running FlowForge](#running-flowforge)
1. [Create a Stack](#create-a-stack)
1. [Configuring FlowForge](#configuring-flowforge)
1. [Mocking email](#mocking-email)
1. [Testing](#testing)
1. [VSCode Tips](#vscode-tips)

### Clone the `flowforge/flowforge` repository

```
git clone https://github.com/flowforge/flowforge
```

### Install `flowforge/flowforge` dependencies

Once the core project is cloned, you will need to install its dependencies.
There are 2 options here...
* [OPTION 1](#option-1-npm) - Install `flowforge/flowforge` dependencies from NPM
* [OPTION 2](#option-2-source-code) - Install `flowforge/flowforge` dependencies from GitHub

> **NOTE:**  
> If running on MacOS 12.3 or newer you may get an error around `node-gyp` 
> being unable to build sqlite3. This is because MacOS no longer includes
> python2.7. The solution is to run the command `npm config set python python3`
> to alias to python3 and then run `npm install` again



#### OPTION 1 NPM


After cloning the core repository, you will need to install 
`flowforge/flowforge` dependencies

```
cd flowforge
npm install
```

By default this will install the latest released versions of the FlowForge
components. 


#### OPTION 2 Source Code

After cloning the core repository, you will need to install 
`flowforge/flowforge` dependencies

Instead of using NPM, you can instead run from the latest source code.
You can check out all the required projects in the same directory along 
side the newly cloned `flowforge` directory. The following commands will
setup everything for you...

```
git clone https://github.com/flowforge/flowforge-driver-localfs.git
git clone https://github.com/flowforge/flowforge-nr-launcher.git
git clone https://github.com/flowforge/flowforge-nr-storage.git
git clone https://github.com/flowforge/flowforge-nr-auth.git
git clone https://github.com/flowforge/flowforge-nr-audit-logger.git
git clone https://github.com/flowforge/forge-ui-components.git
cd flowforge
npm run dev:local
npm run build
```

This will install all the dependencies from source code, create all the required symlinks to the relevant projects and install the necessary npm dependencies.

> **Note**
> The `npm run dev:local` script will modify `package.json` in the 
`flowforge`, `flowforge-nr-launcher` and `flowforge-driver-localfs` projects. 
> DO NOT check these modifications into git.

### Create a Stack
You will need to setup the version(s) of Node-RED you want to use in your stacks.

From the `flowforge` directory run

```
npm run install-stack --vers=2.2.2
```
Where `2.2.2` is the version of Node-RED you want to use in the stack

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

##### Testing against PostgreSQL

By default, the tests use an in-memory sqlite database to test against. This is
the most self-contained way of testing the platform. But it is also necessary to
test against PostgreSQL. To enable the use of PostgreSQL in the tests:

1. Ensure you have an instance of PostgreSQL running locally. For example, via
   docker:

        docker run -it -p 5432:5432 --name ff-postgres -e POSTGRES_PASSWORD=secret postgres

2. Enable PostgrSQL mode by setting the following environment variable:

        export FF_TEST_DB_POSTGRES=true

   The database connection can be set using the following env vars (default values shown)

        export FF_TEST_DB_POSTGRES_HOST=localhost
        export FF_TEST_DB_POSTGRES_PORT=5432
        export FF_TEST_DB_POSTGRES_USER=postgres
        export FF_TEST_DB_POSTGRES_PASSWORD=secret
        export FF_TEST_DB_POSTGRES_DATABASE=flowforge_test

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
```javascript
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
