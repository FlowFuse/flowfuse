# FlowForge
An open source low-code development platform

> Give your users the power to create their own workflows in a secure, scalable, collaborative environment built around the open source Node-RED project.


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

If you're actively developing, then use `npm run serve` to run the application
with automatic rebuilds of the front-end, and restarts of the application when
it is modified.



### Source code structure

```
.
├── config               - build config files
├── forge
│   ├── config
│   ├── containers
│   │   └── node_modules
│   │        └── @flowforge
│   ├── db
│   │   ├── controllers
│   │   ├── models
│   │   └── views
│   └── routes
│       └── api
└── frontend             - the forge frontend
    ├── dist             - build output - created by `npm run build`
    ├── public           - static assets
    └── src              - vue src
        ├── api
        ├── components
        ├── pages
        │   └── account
        ├── routes
        └── store
```
