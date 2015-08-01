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

// AWS Publishing
var awsCreds = JSON.parse(fs.readFileSync('./aws.json'));
var TWO_YEAR_CACHE_PERIOD_IN_SEC = 60 * 60 * 24 * 365 * 2;
var awspublish = require('gulp-awspublish');
var publisher = awspublish.create(awsCreds);
var headers = {
  'Cache-Control': TWO_YEAR_CACHE_PERIOD_IN_SEC + "",
  'Expires': new Date('2030')
};
var knownOptions = {
  string: 'env',
  default: { env: process.env.NODE_ENV || 'production' }
};
var options = minimist(process.argv.slice(2), knownOptions);
// options.env

gulp.task('clean', function () {
  del(['./temp/js/*.js'], function (err, paths) {
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
  var location = options.location === 'user' ? 'temp' : 'public';

  gulp.src(location+ '/less/main.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest(location+'/css'));
});

gulp.task('cssmin', function() {
  var location = options.location === 'user' ? 'temp' : 'public';

  gulp.src(location + '/css/main.css')
    .pipe(csso())
    .pipe(rename({
      suffix: '.min'
    }))
    .pipe(gulp.dest(location + 'public/css'));
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

gulp.task('mayk', ['less', 'watch']);

gulp.task('publishAssets', ['publishJS', 'publishCSS']);

gulp.task('publishCSS', ['less', 'cssmin'], function() {
  var s3Dirname = ['/',options.username,'/css'].join('');
  // Will take the min.css file and push it to S3
  return gulp.src('./temp/css/*.css')
    .pipe(rename(function (path) {
        path.dirname += s3Dirname
    }))
    .pipe(publisher.publish(headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter());
})

gulp.task('publishJS', function() {
  var s3Dirname = ['/',options.username,'/js'].join('');
  // Will take the min.js file and push it to S3
  return gulp.src('./temp/js/*.js')
    .pipe(rename(function (path) {
        path.dirname += s3Dirname
    }))
    .pipe(publisher.publish(headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter());
});

gulp.task('jsGzip', function() {
  return gulp.src('./temp/js/*.js')
    .pipe(awspublish.gzip({ ext: '.gz' }))// gzip, Set Content-Encoding headers and add .gz extension
    .pipe(publisher.publish(headers))
    .pipe(publisher.cache())
    .pipe(awspublish.reporter());
});
