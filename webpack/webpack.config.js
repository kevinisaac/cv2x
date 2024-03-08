const loaders = require('./loaders.js');
const plugins = require('./plugins.js');
const path = require('path');
const webpack = require('webpack');
const dotenv = require('dotenv');


module.exports = (env) => {
    // We're concatenating the environment name to our filename to specify the correct env file
    let envFile;
    switch (env.ENVIRONMENT) {
        case 'dev':
            envFile = '.env.dev';
            break;
        case 'demo':
            envFile = '.env.demo';
            break;
        case 'live':
            envFile = '.env.live';
            break;
        default:
            envFile = '.env';
            break;
    }


    // Set the path parameter in the dotenv config
    const fileEnv = dotenv.config({ path: envFile }).parsed;

    // No proper way to read from .env via circleci so doing this
    const finalEnv = { ...fileEnv, ...env };

    // reduce it to a nice object, the same as before (but with the variables from the file)
    let envKeys = Object.keys(finalEnv).reduce((prev, next) => {
        prev[`process.env.${next}`] = JSON.stringify(finalEnv[next]);
        return prev;
    }, {});

    return {
        entry: './frontend/src/app.js',
        devServer: {
            host: '0.0.0.0',
            port: 8080,
            // port: 7000,
            contentBase: 'templates/',
            proxy: {
                '/api': 'http://backend:5000',
                '/static': 'http://backend:5000',
                '/uploads': 'http://backend:5000',
                // '/api': 'http://127.0.0.1:5000',
                // '/static': 'http://127.0.0.1:5000',
                // '/uploads': 'http://127.0.0.1:5000',
            },
            historyApiFallback: true,
        },
        output: {
            path: path.resolve(__dirname, '/../static'),
            // path: __dirname + '/../static',
            publicPath: 'static',
            filename: 'bundle.js',
            hashFunction: 'sha256',
        },
        module: {
            rules: [
                loaders.CSSLoader,
                loaders.JSLoader,
            ]
        },
        plugins: [
            plugins.MiniCssExtractPlugin,
            new webpack.DefinePlugin(envKeys),
        ],
        resolve: {
            alias: {
                src: path.resolve('./frontend/src/'),
                data: path.resolve('./frontend/data/'),
            }
        },
        devtool: `eval-source-map`,
    }
};

