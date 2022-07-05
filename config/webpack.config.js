const HTMLWebpackPlugin = require('html-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const CopyPlugin = require('copy-webpack-plugin')
const Dotenv = require('dotenv-webpack')

const MiniCssExtractPlugin = require('mini-css-extract-plugin')

const path = require('path')

function getPath (file) {
    return path.resolve(__dirname, '..', file)
}

module.exports = {
    entry: {
        main: getPath('frontend/src/main.js'),
        setup: getPath('frontend/src/setup.js')
    },
    output: {
        path: getPath('frontend/dist/app'),
        publicPath: '/app'
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
                    'css-loader',
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
                loader: 'file-loader',
                options: {
                    outputPath: '/assets',
                    esModule: false
                }
            }
        ]
    },
    plugins: [
        new VueLoaderPlugin(),
        new CleanWebpackPlugin(),
        new HTMLWebpackPlugin({
            title: 'FlowForge',
            template: getPath('frontend/src/index.html'),
            favicon: getPath('frontend/public/favicon.ico'),
            filename: getPath('frontend/dist/index.html'),
            chunks: ['main']
        }),
        new HTMLWebpackPlugin({
            title: 'FlowForge',
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
        new Dotenv()
    ],
    resolve: {
        extensions: ['*', '.js', '.vue', '.json'],
        alias: {
            vue: require.resolve('vue/dist/vue.esm-bundler.js'),
            '@core': getPath('forge'),
            '@': getPath('frontend/src')
        }
    },
    optimization: {
        moduleIds: 'deterministic',
        runtimeChunk: 'single',
        splitChunks: {
            cacheGroups: {
                vendor: {
                    test: /[\\/]node_modules[\\/]/,
                    name: 'vendors',
                    priority: -10,
                    chunks: 'all'
                }
            }
        }
    },
    devServer: {
        port: 3000,
        historyApiFallback: true
    }
}
