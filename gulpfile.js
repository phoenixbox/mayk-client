// var _             = require('lodash');
// var config        = {
//   "browserify": {
//     "path": "./app",
//     "src": "./app/index.js",
//     "build": "./public/js/build",
//     "dist": "./public/js/dist"
//   }
// }
// var gutil    = require('gulp-util');
// var notifier = require('node-notifier');
//
// var errorsHandler = {
//   browserifyErrorHandler: function (err) {
//     notifier.notify({ message: 'Error: ' + err.message });
//     gutil.log(gutil.colors.red('Error'), err.message);
//     this.emit('end');
//   }
// };
//
// var del           = require('del');
// var gulp          = require('gulp');
// var gutil         = require('gulp-util');
// var plumber       = require('gulp-plumber');
// var transform     = require('vinyl-transform');
// var browserify    = require('browserify');
// var watchify      = require('watchify');
// var babelify      = require('babelify');
// var envify        = require('envify/custom');
// var shimify       = require('browserify-shim');
// var uglify        = require('gulp-uglify');
// var minimist      = require('minimist');
// var exorcist      = require('exorcist');
// var transform     = require('vinyl-transform');
// var map           = require('map-stream');
// var path          = require('path');
// var rename        = require("gulp-rename");
// var concat        = require('gulp-concat');
// var ignore        = require('gulp-ignore');
//
// // clean task
// gulp.task('javascript:clean', function () {
//   del([config.browserify.build], function (err, paths) {
//     gutil.log(
//       'Deleted files/folders:\n',
//       gutil.colors.cyan(paths.join('\n'))
//     );
//   });
// });
//
// // watch task
// gulp.task('default', ['javascript:clean'], function () {
//   var bundle;
//   var bundler;
//   var cached = {};
//   var argv = minimist(process.argv.slice(2));
//   var source = argv.only ? config.browserify.path + argv.only : config.browserify.src;
//   bundler = function() {
//     return transform(function(filename) {
//       if (cached[filename]) {
//         return cached[filename].bundle();
//       }
//       var b = watchify(browserify(filename, _.extend({debug: true}, watchify.args)));
//
//       b.on('time', function(time) {
//         gutil.log(gutil.colors.green('Bundle'), filename + gutil.colors.magenta(' in ' + time + 'ms'));
//       });
//       b.on('error', errorsHandler.browserifyErrorHandler);
//       b.on('update', bundle(filename));
//       b.transform(babelify);
//       b.transform(shimify);
//       b.transform(envify({
//         NODE_ENV: 'development'
//       }), { global: true });
//
//       cached[filename] = b;
//
//       return b.bundle();
//     });
//   };
//
//   bundle = function(filename){
//     return function() {
//       var stream = gulp.src([filename])
//                       .pipe(plumber({ errorHandler: errorsHandler.browserifyErrorHandler }))
//                       .pipe(bundler())
//                       .pipe(rename("mayk.js"))
//                       .pipe(
//                         transform(function() {
//                           return exorcist(path.join(config.browserify.build, 'mayk' + '.map'));
//                        })
//                       )
//                       .pipe(gulp.dest(config.browserify.build))
//       return stream;
//     };
//   };
//
//   return bundle(source)();
// });
//
// // gulp.task('javascript:prod', ['javascript:clean'], function() {
// //   browserifyProd = function() {
// //     return transform(function(filename) {
// //       var b = browserify(filename);
// //       b.transform(babelify);
// //       b.transform(shimify);
// //       b.transform(envify({
// //         NODE_ENV: 'production'
// //       }), { global: true });
// //
// //       return b.bundle();
// //     });
// //   };
// //
// //   bundle = function(filename){
// //     return function() {
// //       var stream = gulp.src([filename])
// //                   .pipe(browserifyProd())
// //                   .pipe(concat('mayk.min.js'))
// //                   .pipe(ignore.exclude([ "**/*.map" ]))
// //                   .pipe(uglify().on('error', gutil.log))
// //                   .pipe(gulp.dest(config.browserify.dist))
// //     };
// //   };
// //
// //   return bundle('./app/frontend/javascripts/**/*.js')()
// // });

var gulp = require('gulp');
var less = require('gulp-less');
var exec = require('child_process').exec;
var sourcemaps = require('gulp-sourcemaps');
var csso = require('gulp-csso');
var rename = require('gulp-rename');

gulp.task('less', function() {
  gulp.src('public/less/main.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('public/css'));
});

gulp.task('cssmin', function() {
  gulp.src('public/css/main.css')
    .pipe(csso())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest('public/css'));
});

gulp.task('watch', function() {
  var child = exec('npm run watchify');
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  process.on('exit', function(code) {
    if (child.exit) { child.exit(code); }
  });
  child.on('exit', function(code) {
    process.exit(code);
  });

  gulp.watch('public/less/**/*.less', ['less']);
});

gulp.task('css', ['less', 'cssmin']);

gulp.task('default', ['less', 'watch']);
