module.exports = function() {
    var client = './src/client/',
        clientApp = client + 'app/',
        temp = './.tmp/';

    var config = {
        temp: temp,
        /*
         * Files paths
         */
        // All the js to vet
        alljs: [
            './src/**/*.js',
            './*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        client: client,
        css: temp + 'styles.css',
        index: client + 'index.html',
        js: [
            clientApp + '**/*.module.js',
            clientApp + '**/*.js',
            '!' + clientApp + '**/*.spec.js'
        ],
        less: client + 'styles/styles.less',
        bower: {
            json: require('./bower.json'),
            directory: './bower_components/',
            ignorePath: '../..'
        }
    };

    config.getWiredepDefaultOptions = function() {
        var options = {
            bowerJson: config.bower.json,
            directory: config.bower.directory,
            ignorePath: config.bower.ignorePath
        };
        return options;
    };

    return config;
};
