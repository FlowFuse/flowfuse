# FlowForge UI Components

Detailed documentation on each of the available components (including examples) can be found here: https://flowforge.github.io/forge-ui-components/

## How to use

In order to include these Vue components into an existing VueJs project, include the following in your `main.js` file:

```javascript
// Import FlowForge UI Vue Components
import ForgeUIComponents from '@flowforge/forge-ui-components'
// Import FlowForge UI Component Styling
import '@flowforge/forge-ui-components/dist/forge-ui-components.css'

createApp()
    .use(ForgeUIComponents)
    .mount(...)

```

## Contributing

### Build Library

```bash
npm run build
```

In order to build the project, ready for publishing and use, run the `npm run build` command. This will output three files: into `/dist`:

```
/dist/forge-ui-components.css
/dist/forge-ui-components.js
/dist/forge-ui-components.mjs
```

### Build Documentation

```bash
npm run build-docs
```

The GitHub pages documentation is built into `/dist/docs` (defined in `vue.config.js`). It is configured as a subtree of the GitHub repo on the `gh-pages` branch.

## References

Project structure inspired by: https://blog.logrocket.com/building-vue-3-component-library/