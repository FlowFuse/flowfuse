const path = require('path')

const { sentryWebpackPlugin } = require('@sentry/webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const DotenvPlugin = require('dotenv-webpack')
const HTMLWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const { DefinePlugin } = require('webpack')

require('dotenv').config()

function getPath (file) {
    return path.resolve(__dirname, '..', file)
}

module.exports = function (env, argv) {
    const config = {
        entry: {
            main: getPath('frontend/src/main.js'),
            setup: getPath('frontend/src/setup.js')
        },
        output: {
            path: getPath('frontend/dist/app'),
            publicPath: '/app/',
            assetModuleFilename: './assets/[hash][ext][query]',
            filename: '[name].js'
        },
        module: {
            rules: [
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader'
                    }
                },
                {
                    test: /\.vue$/,
                    loader: 'vue-loader'
                },
                {
                    test: /\.css$/i,
                    include: getPath('frontend/src'),
                    use: [
                        {
                            loader: MiniCssExtractPlugin.loader,
                            options: {}
                        },
                        {
                            loader: 'css-loader',
                            options: { importLoaders: 1 }
                        },
                        {
                            loader: 'postcss-loader',
                            options: {
                                postcssOptions: {
                                    config: path.resolve(__dirname, 'postcss.config.js')
                                }
                            }
                        }
                    ]
                }, {
                    test: /\.css$/i,
                    exclude: getPath('frontend/src'),
                    use: [
                        {
                            loader: 'style-loader',
                            options: {}
                        },
                        {
                            loader: 'css-loader',
                            options: { importLoaders: 1 }
                        }
                    ]
                }, {
                    test: /\.scss$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: { import: true, url: true }
                        },
                        {
                            loader: 'sass-loader',
                            options: {
                                additionalData: '@import "@/ui-components/stylesheets/ff-colors.scss";@import "@/ui-components/stylesheets/ff-utility.scss";'
                            }
                        }

                    ]
                },
                {
                    test: /\.(eot|ttf|woff|woff2)(\?\S*)?$/,
                    loader: 'file-loader',
                    options: {
                        name: '[name][contenthash:8].[ext]'
                    }
                },
                {
                    test: /\.(png|jpe?g|gif|webm|mp4|svg)$/,
                    type: 'asset'
                }
            ]
        },
        plugins: [
            new VueLoaderPlugin(),
            new CleanWebpackPlugin(),
            new HTMLWebpackPlugin({
                title: 'FlowFuse',
                template: getPath('frontend/src/index.html'),
                favicon: getPath('frontend/public/favicon.ico'),
                filename: getPath('frontend/dist/index.html'),
                chunks: ['main']
            }),
            new HTMLWebpackPlugin({
                title: 'FlowFuse',
                template: getPath('frontend/src/setup.html'),
                favicon: getPath('frontend/public/favicon.ico'),
                filename: getPath('frontend/dist-setup/setup.html'),
                chunks: ['setup']
            }),
            new MiniCssExtractPlugin(),
            new CopyPlugin({
                patterns: [
                    { from: getPath('frontend/public'), to: '..' }
                ],
                options: {
                    concurrency: 100
                }
            }),
            new DotenvPlugin(),
            new DefinePlugin({
                __VUE_OPTIONS_API__: true,
                __VUE_PROD_DEVTOOLS__: argv?.mode === 'development'
            })
        ],
        optimization: {
            moduleIds: 'deterministic',
            runtimeChunk: 'single',
            splitChunks: {
                cacheGroups: {
                    vendor: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'vendors',
                        priority: -10,
                        chunks: 'initial'
                    },
                    async: {
                        test: /[\\/]node_modules[\\/]/,
                        name: 'async-vendors',
                        priority: -10,
                        chunks: 'async'
                    }
                }
            }
        },
        devServer: {
            port: 3000,
            historyApiFallback: true
        },
        resolve: {
            alias: {
                // Use vue with the runtime compiler (needed for template strings)
                // To-do: Remove use of template strings, https://github.com/FlowFuse/flowfuse/issues/3290
                vue: 'vue/dist/vue.esm-bundler.js',
                '@': path.resolve('frontend/src')
            }
        }
    }

    // Add sentry only if ENV var is set
    if (process.env.SENTRY_AUTH_TOKEN) {
        config.plugins.push(
            sentryWebpackPlugin({
                authToken: process.env.SENTRY_AUTH_TOKEN,
                org: process.env.SENTRY_ORG,
                project: process.env.SENTRY_PROJECT,

                telemetry: false,

                errorHandler: (err) => {
                    console.warn(`Error with Sentry reporting: ${err.toString()}`)
                }
            })
        )
    }

    return config
}
