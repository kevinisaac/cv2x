module.exports = {
    plugins: {
        'postcss-import': {},
        'postcss-nested': {},
        'autoprefixer': {},
        'postcss-simple-vars': {},
        'postcss-preset-env': {
            browsers: 'last 4 versions',
        },
        'cssnano': {},
    },
};

