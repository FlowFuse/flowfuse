import vue from 'rollup-plugin-vue'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
// import scss from 'rollup-plugin-scss'
import postcss from 'rollup-plugin-postcss'
import copy from 'rollup-plugin-copy'

export default [
    {
        input: 'src/index.js',
        output: [
            {
                format: 'esm',
                file: 'dist/forge-ui-components.mjs'
            },
            {
                format: 'cjs',
                file: 'dist/forge-ui-components.js'
            }
        ],
        plugins: [
            vue(),
            peerDepsExternal(),
            postcss({
                minimize: false,
                modules: false,
                use: {
                    sass: true
                },
                extract: true
            }),
            copy({
                targets: [
                    { src: 'src/stylesheets/ff-colors.scss', dest: 'dist/scss', rename: 'forge-colors.scss' }
                ]
            })
        ]
    }
]
