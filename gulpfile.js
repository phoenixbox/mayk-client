var gulp = require('gulp');
var del = require('del');
var gutil = require('gulp-util');
var less = require('gulp-less');
var exec = require('child_process').exec;
var sourcemaps = require('gulp-sourcemaps');
var csso = require('gulp-csso');
var rename = require('gulp-rename');
var fs = require('fs');
var minimist = require('minimist');
var knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'production' }
};
var options = minimist(process.argv.slice(2), knownOptions);

gulp.task('clean', function () {
  del([
    './temp/**',
  ], function (err, paths) {
    gutil.log(
      'Deleted files/folders:\n',
      gutil.colors.cyan(paths.join('\n'))
    );
  });
});

/*
  TODO: Prevent the actual creation of this mutated file
*/
gulp.task('cleanSedResult', function () {
  del([
    './temp/index.html-e',
  ], function (err, paths) {
    gutil.log(
      'Deleted files/folders:\n',
      gutil.colors.cyan(paths.join('\n'))
    );
  });
});

function run(command) {
  var child = exec(command);
  child.stdout.pipe(process.stdout);
  child.stderr.pipe(process.stderr);
  process.on('exit', function(code) {
    if (child.exit) { child.exit(code); }
  });
  child.on('exit', function(code) {
    process.exit(code);
  });
}

gulp.task('less', function() {
  var destPrefix = options.location === 'user' ? 'temp' : 'public';
  var dest = [destPrefix, '/css'].join('');

  // Initial src is always the main public (until separate sheets are used)
  gulp.src('public/less/main.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(dest));
});

gulp.task('cssmin', function() {
  var destPrefix = options.location === 'user' ? 'temp' : 'public';

  gulp.src(destPrefix+'/css/main.css')
    .pipe(csso())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(destPrefix+'/css'));
});

gulp.task('watch', function() {
  run('npm run watchify');
  // run('npm run watchify-test');
  gulp.watch('public/less/**/*.less', ['less']);
});

gulp.task('dev', ['default'], function() {
  run('npm start');
});

gulp.task('css', ['less', 'cssmin']);

gulp.task('default', ['less', 'watch']);
