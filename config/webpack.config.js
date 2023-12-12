const path = require('path')

const { sentryWebpackPlugin } = require('@sentry/webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const CopyPlugin = require('copy-webpack-plugin')
const DotenvPlugin = require('dotenv-webpack')
const HTMLWebpackPlugin = require('html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const { VueLoaderPlugin } = require('vue-loader')

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
                        'sass-loader'
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
            new DotenvPlugin()
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
