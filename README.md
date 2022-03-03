# FlowForge UI Components

Project structure inspired by: https://blog.logrocket.com/building-vue-3-component-library/

## How to use

In order to include these Vue components into an existing VueJs project, include the following in your `main.js` file:

```javascript
// Import FlowForge UI Vue Components
import FlowForgeUIComponents from '@flowforge/flowforge-ui-components'
// Import FlowForge UI Component Styling
import '@flowforge/flowforge-ui-components/dist/flowforge-ui-components.css'

createApp()
    .use(FlowForgeUIComponents)
    .mount(...)

```

## Contributing

### Build Library

```bash
npm run build
```

In order to build the project, ready for publishing and use, run the `npm run build` command. This will output three files: into `/dist`:

```
/dist/flowforge-ui-components.css
/dist/flowforge-ui-components.js
/dist/flowforge-ui-components.mjs
```

### Build Documentation

```bash
npm run build-docs
```

The GitHub pages documentation is built into `/dist/docs` (defined in `vue.config.js`). It is configured as a subtree of the GitHub repo on the `gh-pages` branch.