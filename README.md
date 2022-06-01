# FlowForge
An open source low-code development platform

> Give your users the power to create their own workflows in a secure, scalable, collaborative environment built around the open source Node-RED project.

## Prerequisites

 - NodeJS v16

## Development

```
# Clone the repo
git clone https://github.com/flowforge/flowforge.git 

cd flowforge

# Install dependencies
npm install

# Build the front end
npm run build

# Start the application
npm start
```

If you are actively developing the FlowForge core, then use `npm run serve` to run the application
with automatic rebuilds of the front-end, and restarts of the application when
it is modified.

If you intend on developing the additional repositories, please refer to [the docs](https://flowforge.com/docs/contribute/) 
for detailed developer setup instructions.



### Source code structure

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
