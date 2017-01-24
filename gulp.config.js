module.exports = function() {
    var config = {
        // all the js to vet
        alljs: [
            './src/**/*.js',
            './*.js'
        ]
    };

    return config;
};
