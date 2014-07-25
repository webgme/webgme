/*globals require, console, __dirname*/

var gulp = require('gulp'),
    jshint = require('gulp-jshint'),
    sourcePattern = 'client/js/**/*.js';

gulp.task('lint', function () {
    'use strict';

    gulp.src(sourcePattern)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

function changeNotification(event) {
    'use strict';

    console.log('File', event.path, 'was', event.type, ', running tasks...');
}

function build() {
    'use strict';

    var jsWatcher = gulp.watch(sourcePattern, [/*'js',*/ 'lint']);

    jsWatcher.on('change', changeNotification);
}

gulp.task('default', [/*'js',*/ 'lint'], build);