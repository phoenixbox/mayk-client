var _ = require('lodash');
var config = require('config');
var request = require('superagent-bluebird-promise');
var helpers = require('../helpers.js');
var swig = require('swig');
var mkdirp = require('mkdirp');
var GitHubApi = require("github");
var fs = require('fs');
var path = require('path');
var async = require('async');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var child_process = require('child_process');
var terminal = require('child_process').spawn('bash');
//  Official
var AWS = require('aws-sdk');
var awsCreds = JSON.parse(fs.readFileSync('./aws.json'));
//  Unofficial
var s3 = require('s3');

exports.register = function(server, options, callback) {

  server.method('findOrCreateMaykRepo', function(token, profile, next) {
    // var token = token;
    // var username = profile.username;
    // Mock keys here for easy access
    var token = '16860027048e98facf4e0f2efb3a0ac154c81d4c';
    var username = 'phoenixbox';

    var github = new GitHubApi({
      version: "3.0.0",
    });
    github.authenticate({
      type: "oauth",
      token: token
    });

    // Question can I find an empty repo?
    // Authentication from shell script command line

    // Clean temp
    // CANT_findEmptyRepo
    //   gulp build into ./temp
    //   push minified js to S3
    //   pull list of objects from bucket
    //   replace the js script in ./index.html with the .min scripts ref
    //   initialize repo
    //   commit contents of new repo
    //   create repo gh-pages branch
    //   set repo gh-pages branch as default
    // CAN_findEmptyRepo
    //   gulp build into ./temp
    //   overwrite user-user.uuid minified js in S3 - ref in callback
    //   replace the js script in ./index.html with the min script ref
    //   clone repo to temp dir
    //   commit these changes with message

    async.waterfall([
      async.apply(internals.cleanAssets),
      async.apply(internals.buildJS, username),
      async.apply(internals.buildCSS, username),
      async.apply(internals.publishAssets, username),
      async.apply(internals.listAssets, username),
      async.apply(internals.getSignedUrls, username),
      function(signedUrls, callback) {
        console.log('ARGUMENTS ', arguments);
        console.log('CALLBACK IS: ', callback);
        internals.findOrCreateRepo(github, username, signedUrls, callback);
      },
      function(repo, callback) {
        internals.gitAndGHPagesInit(repo, callback);
      },
      function(repo, callback) {
        internals.setGHPagesAsDefault(repo.url, repo.name, repo.owner, token, callback)
      }
    ], function(err, repo) {
      console.log("ASYNC CALLBACK ARGS: ", arguments);
      if (err) {
        next(err, null)
      } else {
        next(err, {repo: repo});
      }
    });
  });

  // Restart replace the index.html script and style tags with the remote signed urls

  server.method('getPortfolioData', function(profile, next) {
    // TODO: Fetch persisted data from the rails app

    console.log('getPortfolioData ****');
    var data = {
      github_username: 'phoenixbox',
      github_email: 'srogers@quickleft.com',
      github_display_name: 'Shane Rogers'
    }

    next(null, data)
  });

  server.method('publishGithubPage', function(github, portfolioData, next) {
    console.log('publishGithubPage ****');
    console.log('path ****: ', portfolioPath);

    var html = swig.renderFile('views/portfolio.html', {
        pagename: 'awesome people',
        authors: ['Paul', 'Jim', 'Jane']
    });

    mkdirp('/tmp/foo/bar/baz', function (err) {
        if (err) console.error(err)
        else console.log('pow!')
    });
    next(null, true)
  });

  callback();
};

exports.register.attributes = {
  name: 'api-github',
  version: '0.0.1'
};

var internals = {
  setGHPagesAsDefault: function(url, repo, owner, token, cb) {
    var authedURL = internals.authenticate(url, token);
    console.log('PATCH REQUEST: ', authedURL);

    var params = _.extend(internals.repoCRUDParams(owner.login),{"default_branch": "gh-pages"})

    return request.patch(authedURL)
                  .send(params)
                  .then(function(repo) {
                      console.log('GHPages is DEFAULT');
                      // neeed to pass back the callback function
                      // experiment: cb(null, _.partial(cb, null, repo))
                      cb(null, repo)
                    }, function(err) {
                      console.log('GHPages ERROR: err: ', err);
                      cb(err, null)
                    });
  },
  authGet: function(uri, params) {
    console.log('**** AUTHENTICATION GET');
    return request.get(uri)
                  .send(params)
                  .set('Accept', 'application/vnd.github.v3+json')
                  .set('Accept', 'application/vnd.github.moondragon+json')
  },
  findOrCreateRepo: function(github, username, signedUrls, cb) {
    var params = internals.repoGetParams(username);

    return github.repos.get(params, function(err, repo) {
      if (err) {
        return internals.createRepo(github, username, cb)
      } else {
        cb(null, repo)
      }
    });
  },
  createRepo: function(github, username, cb) {
    var params = internals.repoCRUDParams(username);

    return github.repos.create(params, function(err, repo) {
      if (err) {
        console.log('ERROR: ', err);
        cb(err, null)
      } else {
        cb(null, repo)
      }
    });
  },
  cleanAssets: function(cb) {
    exec('gulp clean\n', function (err, stdout, stderr) {
      internals.logger('clean assets: ', err, stdout, stderr);
      cb(null, {});
    });
  },
  buildJS: function(username, data, cb) {
    var gulpJS = "NODE_ENV=production browserify app | uglifyjs -cm > temp/js/mayk-" + username + ".min.js\n";

    exec(gulpJS, function (err, stdout, stderr) {
      internals.logger('build js: ', err, stdout, stderr);

      cb(null, {});
    });
  },
  buildCSS: function(username, data, cb) {
    var gulpCSS = internals.envifyGulpCmd("gulp css");

    exec(gulpCSS, function (err, stdout, stderr) {
      internals.logger('build css: ', err, stdout, stderr);

      cb(null, {});
    });
  },
  // gulp publishAssets - for gulp route
  publishAssets: function(username, cb) {
    console.log('publishAssets ARGS: ', arguments);
    // Upload to https://s3-us-west-1.amazonaws.com/${bucketName}/${tagname}
    var oneYrCache = 60 * 60 * 24 * 365;
    var files = [
      {
        key: "./temp/js/mayk-phoenixbox.min.js",
        ext: "js"
      },
      {
        key: "./temp/css/main.css",
        ext: "css"
      }
    ]
    var fileCounter = 0;
    _.each(files, function(file, i) {
      var params = {
        localFile: file.key,
        s3Params: {
          Bucket: awsCreds.bucket,
          Key: internals.filenameKey(username, file.ext),
          ACL: 'public-read',
          CacheControl: oneYrCache.toString(),
          Expires: new Date('2030')
        },
      };
      var client = internals.s3Client();
      // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#putObject-property
      var uploader = client.uploadFile(params);

      uploader.on('error', function(err) {
        console.error("unable to upload:", err.stack);
        cb(err.stack, {});
      });
      uploader.on('progress', function() {
        console.log("progress", uploader.progressMd5Amount,
                  uploader.progressAmount, uploader.progressTotal);
      });
      uploader.on('end', function() {
        fileCounter += 1;
        console.log("*** AWS-DONE uploading!: ", arguments);
        if (fileCounter === files.length) {
          cb(null, {});
        }
      });
    })
  },
  filenameKey: function(username, type) {
    return [username,'/mayk-',username,'.min.',type].join('');
  },
  s3Client: function() {
    /*
      NOTE: time skew errors require system clock sync
      Run this:
      $	ntpdate us.pool.ntp.org
    */
    return s3.createClient({
      s3Options: {
        accessKeyId: awsCreds.key,
        secretAccessKey: awsCreds.secret,
        region: 'us-west-1', //N California
        systemClockOffset: 86400000 // 1 day time offset for time skew compensation
      }
    });
  },
  envifyGulpCmd: function(cmd, username) {
    return [cmd,"--location user --username", username, "\n"].join(' ');
  },
  listAssets: function(username, data, cb) {
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#listObjects-property
    var client = internals.s3Client();
    var params = {
      s3Params: {
        Bucket: awsCreds.bucket,
        Prefix: 'phoenixbox'
      },
      recursive: false
    };

    var listObj = client.listObjects(params);
    // Need to memoise the results
    var dataLst = [];

    listObj.on('data', function(data) {
      dataLst = dataLst.concat(data.Contents);
    });
    listObj.on('end', function(err, data) {
      console.log('listObjects arguments: ', arguments);
      console.log('CONTENTS: ', dataLst);

      if (err) {
        cb(err, null)
      } else {
        cb(null, dataLst)
      }
    });
  },
  getSignedUrls: function(user, files, cb) {
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
    var s3sdk = new AWS.S3({
      accessKeyId: awsCreds.key,
      secretAccessKey: awsCreds.secret,
      region: 'us-west-1'
    })

    var ONE_YEAR_SECS = 60 * 60 * 24 * 365 * 2;
    var client = internals.s3Client();
    var fileCounter = 0;

    _.each(files, function(file, i) {
      var signedUrls = [];

      var params = {
        Bucket:'mayk-portfolios',
        Key: file.Key,
        Expires: ONE_YEAR_SECS
      }
      /*
        'getObject' is a required `operation` name
        acceptable params are the same as #getObject
      */
      s3sdk.getSignedUrl('getObject', params, function (err, url) {
        fileCounter += 1;
        if (err) {
          console.log('getSignedUrl: ' + err);
        }
        signedUrls = signedUrls.concat(url);
        console.log('Signed URL: ' + url);

        if (fileCounter === files.length) {
          console.log('signedUrls', signedUrls)
          cb(null, signedUrls);
        }
      });
    })
  },
  gitAndGHPagesInit: function(repo, cb) {
    var repoURL = repo.url;
    var sshURL = repo.ssh_url;

    terminal.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });

    terminal.on('exit', function (code) {
      if (code == 0) {
        console.log('***** PUSH SUCCESS ', repo)
        cb(null, repo)
      } else {
        console.log('***** PUSH FAIL ', code)
        cb(code, null)
      }
    });
    var createRepoCommand = './gitAndGHPagesInit.sh ' + sshURL + '\n';
    terminal.stdin.write('cd ./temp\n'); // Assuming location is project root
    terminal.stdin.write(createRepoCommand);
    terminal.stdin.write('ls -la\n'); // To verify that the gulped assets are there
    terminal.stdin.write('uptime\n');
    terminal.stdin.end();
  },
  authenticate: function(url, token) {
    return [url, '?access_token=', token].join('');
  },
  repoGetParams: function(username) {
    return {
      user: username,
      repo: "mayk"
    }
  },
  repoCRUDParams: function(username) {
    var description = "Mayk Portfolio for " + username;
    var homepage = ["https://",username,".github.io/mayk"].join('');

    return {
      "name": "mayk",
      "description": description,
      "homepage": homepage
    }
  },
  logger: function(processName, err, stdout, stderr) {
    if (err) {
      console.log(processName + ' err', err);
    }
    if (stdout) {
      console.log(processName + ' stdout', stdout);
    }
    if (stderr) {
      console.log(processName + ' stderr', stderr);
    }
  }
}

module.exports.internals = internals;
