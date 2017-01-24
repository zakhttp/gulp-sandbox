/*  Lazy loaded gulp plugins

        gulp-jshint
        gulp-jscs
        gulp-util
        gulp-print
        gulp-if
        gulp-less
        gulp-autoprefixer

*/

var gulp = require('gulp'),
    config = require('./gulp.config')(),
    args = require('yargs').argv,
    del = require('del'),
    $ = require('gulp-load-plugins')({ lazy: true });

gulp.task('vet', function() {
    log('Analyzing source with JSHint and JSCS');
    return gulp
        .src(config.alljs)
        .pipe($.if(args.verbose, $.print()))
        // .pipe($.jscs())
        .pipe($.jshint())
        .pipe($.jshint.reporter('jshint-stylish', { verbose: true }))
        .pipe($.jshint.reporter('fail'));

});

gulp.task('styles', ['clean-styles'], function() {
    log('Compiling less --> CSS');
    return gulp
        .src(config.less) //TODO add the config
        .pipe($.plumber())
        .pipe($.less())
        // .on('error', errorLogger)
        .pipe($.autoprefixer({ browsers: ['last 2 version', '> 5%'] }))
        .pipe(gulp.dest(config.temp));
});

gulp.task('clean-styles', function(done) {
    var files = config.temp + '**/*.css';
    clean(files, done);
});

gulp.task('less-watcher', function() {
    gulp.watch(config.less, ['styles']);
});

////////
function errorLogger(error) {
    log('*** Start of Error');
    log(error);
    log('*** End of Error');
    this.emit('end');
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
