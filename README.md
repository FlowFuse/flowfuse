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

If you're actively developing, then use `npm run build-watch` to have webpack
automatically rebuild the frontend if you modify any of its files.
In a second terminal, use `npm run start-watch` that uses nodemon to do the same
for the core application.



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
