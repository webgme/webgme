/*globals require, console*/
/*jshint node: true*/
'use strict';

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    shell = require('gulp-shell'),
    runSequence = require('run-sequence'),
    srcPattern = ['src/**/*.js', 'test/**/*.js'],
    clientSrcPattern = 'src/client/js/**/*.js';

gulp.task('lint', function () {

    gulp.src(clientSrcPattern)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('lint-all', function () {

    gulp.src(srcPattern)
        .pipe(jshint('.jshintrc'))
        .pipe(jshint.reporter('jshint-stylish'));
});

function changeNotification(event) {

    console.log('File', event.path, 'was', event.type, ', running tasks...');
}

function build() {

    var jsWatcher = gulp.watch(clientSrcPattern, [/*'js',*/ 'lint']);

    jsWatcher.on('change', changeNotification);
}

gulp.task('rjs-build', function () {
    var stream = shell(['node ./utils/build/webgme.classes/build_classes.js'])
    .on('error', function (error) {
        // Currently this isn't entered.
        //
        // https://github.com/joyent/node/issues/3584
        // others have the same issue https://github.com/gruntjs/grunt/issues/792
        console.error('build failed with err', error);
        process.exit(1);
    });
    return gulp.src('', {read: false}).pipe(stream);
});

gulp.task('register-watchers', [], function (cb) {
    gulp.watch('src/**/*.js', ['rjs-build']);
    return cb;
});

gulp.task('dev', function (cb) {
    runSequence('rjs-build', 'register-watchers', cb);
});

gulp.task('compile-all', ['rjs-build'], function () { });

gulp.task('default', [/*'js',*/ 'lint'], build);
