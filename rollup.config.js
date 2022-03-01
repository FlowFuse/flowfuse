import vue from 'rollup-plugin-vue'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
// import scss from 'rollup-plugin-scss'
import postcss from 'rollup-plugin-postcss'

export default [
    {
        input: 'src/index.js',
        output: [
            {
                format: 'esm',
                file: 'dist/flowforge-ui-components.mjs'
            },
            {
                format: 'cjs',
                file: 'dist/flowforge-ui-components.js'
            }
        ],
        plugins: [
            vue(),
            peerDepsExternal(),
            postcss({
                minimize: false,
                modules: true,
                use: {
                    sass: true
                },
                extract: true
            })
        ]
    }
]
