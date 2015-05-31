var _ = require('underscore');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');
var util = require('gulp-util');
var less = require('gulp-less');
var browserify = require('browserify');
var watchify = require('watchify');
var source = require('vinyl-source-stream');
var buffer = require('vinyl-buffer');
var reactify = require('reactify');

var config = {
  external: ['underscore'],
  watch: false,
  sourceMaps: true
};

gulp.task('build-external', function() {
  return externalBrowserify();
});

gulp.task('build-app', function() {
  return appBrowserify('./App.js', 'app.js');
});

gulp.task('build-worker', function() {
  return appBrowserify('./worker/GeometryWorker.js', 'worker.js');
});

gulp.task('build-css', function () {
  return gulp.src('./css/app.less')
  .pipe(less())
  .pipe(gulp.dest('./build'));
});

gulp.task('build', ['build-external', 'build-app', 'build-worker', 'build-css']);

gulp.task('set-watch', function() {
  config.watch = true;
});

gulp.task('watch', ['set-watch', 'build'], function() {
  gulp.watch(['css/*.less'], ['build-css']);
});

gulp.task('default', ['watch']);

function externalBrowserify() {
  var opts = {
    require: config.external
  };

  var b = browserify(opts);

  return b.bundle()
  .on('error', util.log.bind(util, 'Browserify Error'))
  .pipe(source('external.js'))
  .pipe(gulp.dest('./build'));
}

function appBrowserify(src, dest) {
  var customOpts = {
    debug: config.sourceMaps,
    external: config.external,
    list: true,
    entries: [src],
    bundleExternal: false,
    require: 'react'
  };

  var opts = _.extend({}, watchify.args, customOpts);

  var b = browserify(opts);

  if (config.watch) b = watchify(b);

  b.transform(reactify);

  // On any dep update, runs the bundler
  if (config.watch) b.on('update', bundle);

  // Output build logs to terminal
  b.on('log', util.log);

  function bundle() {
    var stream = b.bundle()
    .on('error', util.log.bind(util, 'Browserify Error'))
    .pipe(source(dest))
    .pipe(buffer());

    if (config.uglify) {
      stream = stream.pipe(uglify());
    }

    if (config.sourceMaps) {
      // Loads map from browserify file
      stream = stream.pipe(sourcemaps.init({ loadMaps: true }));
      // Add transformation tasks to the pipeline here.
      // Writes .map file
      stream = stream.pipe(sourcemaps.write('./'));
    }

    stream = stream.pipe(gulp.dest('./build'));

    return stream;
  }

  return bundle();
}
