const path = require('path')

// vue.config.js
module.exports = {
    publicPath: process.env.NODE_ENV === 'production' ? '/forge-ui-components/' : '/',
    pluginOptions: {
        lintStyleOnBuild: true,
        stylelint: {}
    },
    // pages: {
    //     index: {
    //         entry: 'docs/main.js'
    //     }
    // },
    outputDir: path.resolve(__dirname, 'dist/docs')
}
