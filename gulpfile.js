/*  Lazy loaded gulp plugins

        gulp-jshint
        gulp-jscs
        gulp-util
        gulp-print
        gulp-if
        gulp-less
        gulp-autoprefixer
        gulp-inject
        gulp-nodemon
        gulp-task-listing
        gulp-imagemin
        gulp-minify-html
        gulp-angular-templatecache
        gulp-useref
        gulp-csso
        gulp-uglify
        gulp-filter
        gulp-ng-annotate
        gulp-rev
        gulp-rev-replace
        gulp-bump

*/

var gulp = require('gulp'),
    config = require('./gulp.config')(),
    args = require('yargs').argv,
    del = require('del'),
    wiredep = require('wiredep').stream,
    browserSync = require('browser-sync'),
    $ = require('gulp-load-plugins')({
        lazy: true
    }),
    _ = require('lodash'),
    path = require('path'),
    port = process.env.PORT || config.defaultPort;

gulp.task('help', $.taskListing); // TODO segregates tasks
gulp.task('default', ['help']);

gulp.task('vet', function () {
    log('Analyzing source with JSHint and JSCS');
    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', {
            verbose: true
        }))
        .pipe($.jshint.reporter('fail'));

});

gulp.task('styles', ['clean-styles'], function () {
    log('Compiling less --> CSS');
    return gulp
        .src(config.less) //TODO add the config
        .pipe($.plumber())
        .pipe($.less())
        // .on('error', errorLogger)
        .pipe($.autoprefixer({
            browsers: ['last 2 version', '> 5%']
        }))
        .pipe(gulp.dest(config.temp));
});

gulp.task('fonts', ['clean-fonts'], function () {
    log('Copying fonts');
    return gulp
        .src(config.fonts)
        .pipe(gulp.dest(config.build + 'fonts'));
});

gulp.task('images', ['clean-images'], function () {
    log('Copying and compressing the  images');
    return gulp
        .src(config.images)
        .pipe($.imagemin({
            optimizationLevel: 4,
            verbose: args.verbose ? true : false
        }))
        .pipe(gulp.dest(config.build + 'images'));
});

gulp.task('clean', function (done) {
    var delConfig = [].concat(config.build, config.temp);
    log('Cleaning: ' + $.util.colors.blue(delConfig));
    clean(delConfig, done);
});

gulp.task('clean-styles', function (done) {
    clean(config.temp + '**/*.css', done);
});

gulp.task('clean-fonts', function (done) {
    clean(config.build + 'fonts/', done);
});

gulp.task('clean-images', function (done) {
    clean(config.build + 'images/', done);
});

gulp.task('clean-code', function (done) {
    var codeFiles = [].concat(
        config.temp + '**/*.js',
        config.build + '**.*.html',
        config.build + 'js/**/*.js'
    );
    clean(codeFiles, done);
});

gulp.task('less-watcher', function () {
    gulp.watch(config.less, ['styles']);
});

gulp.task('template-cache', ['clean-code'], function () {
    log('Creating AngularJS $templateCache');
    return gulp
        .src(config.htmlTemplates)
        .pipe($.minifyHtml({
            empty: true
        }))
        .pipe($.angularTemplatecache(config.templateCache.file, config.templateCache.options))
        .pipe(gulp.dest(config.temp));
});

gulp.task('wiredep', function () {
    log('Wire up bower CSS, JS and App JS --> index.html');
    var options = config.getWiredepDefaultOptions();

    return gulp
        .src(config.index)
        .pipe(wiredep(options))
        .pipe($.inject(gulp.src(config.js)))
        .pipe(gulp.dest(config.client));
});

gulp.task('inject', ['wiredep', 'styles', 'template-cache'], function () {
    log('Call wiredep & wire up App CSS --> index.html');

    return gulp
        .src(config.index)
        .pipe($.inject(gulp.src(config.css)))
        .pipe(gulp.dest(config.client));
});

gulp.task('build', ['optimize', 'images', 'fonts'], function () {
    log('Building all');
    var msg = {
        title: 'Gulp build',
        subtitle: 'Deployed to the build folder' + config.build,
        message: 'Running `gulp serve-build`'
    };
    del(config.temp);
    log(msg);
    notify(msg);
});

gulp.task('optimize', ['inject', 'test'], function () {
    log('Optimizing the javascript, CSS & HTML');
    var assets = $.useref({
        searchPath: './'
    });
    var templateCache = config.temp + config.templateCache.file;
    var cssFilter = $.filter(['**/*.css'], {
        restore: true
    });
    var jsLibFilter = $.filter(['**/' + config.optimized.lib], {
        restore: true
    });
    var jsAppFilter = $.filter(['**/' + config.optimized.app], {
        restore: true
    });

    return gulp
        .src(config.index)
        .pipe($.plumber())
        .pipe($.inject(gulp.src(templateCache, {
            read: false
        }), {
            starttag: '<!-- inject:template:js -->'
        }))
        .pipe(assets)
        .pipe(cssFilter)
        .pipe($.csso())
        .pipe($.rev()) // *.css --> *-1j89hdhg.css
        .pipe(cssFilter.restore)
        .pipe(jsLibFilter)
        .pipe($.uglify())
        .pipe($.rev()) // lib.js --> lib-1j89hdhg.js
        .pipe(jsLibFilter.restore)
        .pipe(jsAppFilter)
        .pipe($.ngAnnotate({
            add: true
        }))
        .pipe($.uglify())
        .pipe($.rev()) // app.js --> app-1j89hdhg.js
        .pipe(jsAppFilter.restore)
        .pipe($.revReplace())
        .pipe(gulp.dest(config.build))
        .pipe($.rev.manifest())
        .pipe(gulp.dest(config.build));
});

/**
 * Bump the version
 *
 * --type=pre          will bump the prerelease version *.*.*-x
 * --type=patch        or no flag will bump the patch version *.*.x
 * --type=minor        will bump the minor version *.x.*
 * --type=major        will bump the major version x.*.*
 * --version=1.2.3     will bump to a specific version and ignore other flags
 */

gulp.task('bump', function () {
    var msg = 'Bumping versions';
    var type = args.type;
    var version = args.version;
    var options = {};
    if (version) {
        options.version = version;
        msg += ' to ' + version;
    } else {
        options.type = type;
        msg += ' for a ' + type;
    }
    log(msg);
    return gulp
        .src(config.packages)
        .pipe($.print())
        .pipe($.bump(options))
        .pipe(gulp.dest(config.root));
});

gulp.task('serve-build', ['build'], function () {
    serve(false);
});

gulp.task('serve-dev', ['inject'], function () {
    serve(true);
});

gulp.task('test', ['vet', 'template-cache'], function (done) {
    startTests(true /* singleRun */ , done);
});

gulp.task('autotest', ['vet', 'template-cache'], function (done) {
    startTests(false /* singleRun */ , done);
});

/////////////

function serve(isDev) {
    var nodeOptions = {
        script: config.nodeServer,
        delayTime: 1,
        env: {
            'PORT': port,
            'NODE_ENV': isDev ? 'dev' : 'build'
        },
        watch: [config.server] // TODO defines files to restart on

    };
    return $.nodemon(nodeOptions)
        .on('restart', ['vet'], function (ev) {
            log('*** nodemon restarted');
            log('files changed are: \n' + ev);
            setTimeout(function () {
                browserSync.notify('reloading now ...');
                browserSync.reload({
                    stream: false
                });
            }, config.browserReloadDelay);
        })
        .on('start', function () {
            log('*** nodemon started');
            startBrowserSync(isDev);

        })
        .on('crash', function () {
            log('*** nodemon crashed: script crashed form some reason');

        })
        .on('exit', function () {
            log('*** nodemon exited cleanly');

        });
}

function changeEvent(event) {
    var srcPattern = new RegExp('/.*(?=/' + config.source + ')/');
    log('File ' + event.path.replace(srcPattern, '') + ' ' + event.type);
}

function notify(options) {
    var notifier = require('node-notifier');
    var notifyOptions = {
        sound: 'Bottle',
        contentImage: path.join(__dirname, 'gulp.png'),
        icon: path.join(__dirname, 'gulp.png')
    };
    _.assign(notifyOptions, options);
    notifier.notify(notifyOptions);
}

function startBrowserSync(isDev) {
    if (args.nosync || browserSync.active) {
        return;
    }
    log('starting broswer-sync on port: ' + port);
    if (isDev) {
        gulp.watch([config.less], ['styles'])
            .on('change', function (event) {
                changeEvent(event);
            });
    } else {
        gulp.watch([config.less, config.js, config.html], ['optimize', browserSync.reload])
            .on('change', function (event) {
                changeEvent(event);
            });
    }
    var options = {
        proxy: 'localhost:' + port,
        port: 3000,
        files: isDev ? [
            config.client + '**/*.*',
            '!' + config.less,
            config.temp + '**/*.css'
        ] : [],
        ghostMode: {
            clicks: true,
            location: true,
            forms: true,
            scroll: true
        },
        injectChanges: true,
        logFileChanges: true,
        logLevel: 'debug',
        logPrefix: 'gulp',
        notify: true,
        reloadDelay: 0 //1000
    };
    browserSync(options);
}

function startTests(singleRun, done) {
    var Server = require('karma').Server,
        excludeFiles = [],
        serverSpecs = config.serverIntegrationSpecs;

    excludeFiles = serverSpecs;

    var server = Server.start({
        configFile: __dirname + '/karma.conf.js',
        exclude: excludeFiles,
        singleRun: !!singleRun
    }, karmaCompleted);

    function karmaCompleted(karmaResult) {
        var status = karmaResult === 1 ? 'ERROR' : 'SUCCESS';
        log('Karma completed with: ' + status);
        log('Exit Code: ' + karmaResult);
        done();
        // process.exit(karmaResult);

    }
}

function clean(path, done) {
    log('Cleaning assets: ' + $.util.colors.blue(path));
    del(path)
        .then(function sucess() {
            done();
        })
        .catch(function failure(exception) {
            log('Cleaning assets exception: ' + exception);
        });
}

function log(msg) {
    if (typeof msg === 'object') {
        for (var item in msg) {
            if (msg.hasOwnProperty(item)) {
                $.util.log($.util.colors.blue(msg[item]));
            }
        }
    } else {
        $.util.log($.util.colors.blue(msg));
    }
}
