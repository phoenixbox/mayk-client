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
var APP_ROOT = path.resolve(__dirname);
var moment = require('moment');

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

    // Find or create repo
    // DEFAULT
    //   clean the temp assets dir
    //   gulp build JS - using browserify etc
    //   gulp build CSS
    //   publish assets to S3
    //   fetch the users published asset reference objects
    //   generate signedUrls for these assets
    //   replace the asset urls in the index file
    //   clean up the leftovers from the sed command
    //   find or create repo
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

    // restart
    // tie together the steps and see if the correct vars are being passed around
    // build the clone repo step into temp
    // smoke test with a new gh user
    async.waterfall([
      async.apply(internals.cleanAssets),
      function(data, callback) {
        internals.findOrCreateRepo(github, username, token, callback);
      },
      function(data, callback) {
        internals.cleanAssets(callback);
      },
      // async.apply(internals.cloneRepo), // clone repo to ./temp
      // async.apply(internals.buildJS, username),
      // async.apply(internals.buildCSS, username),
      // async.apply(internals.publishAssets, username),
      // async.apply(internals.listAssets, username),
      // async.apply(internals.getSignedUrls),
      // async.apply(internals.replaceAssetRefs),
      // async.apply(internals.cleanSedResult),
      // async.apply(internals.pushRepoUpdates),
    ], function(err, repo) {
      console.log("FINAL CALLBACK: ", arguments);
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
  setGHPagesAsDefault: function(url, repoName, owner, token, cb) {
    console.log('setGHPagesAsDefault arguments: ', arguments);
    // console.log('setGHPagesAsDefault repo: ', repoName);

    var authedGHBranchURL = internals.authenticate(url, token);
    var params = _.extend(internals.repoCRUDParams(owner.login),{"default_branch": "gh-pages"})

    async.waterfall([
      function(innerCB) { // Set GHPages as default branch
        request.patch(authedGHBranchURL)
                .send(params)
                .then(function(resp) {
                  innerCB(null, resp.body) // Pass back the repo in the body of response
                }, function(err) {
                  console.log('GHPages default ERROR: err: ', err);
                  innerCB(err, null)
                });
      },
      function(repo, innerCB) { // Delete the master branch
        // References API- /repos/phoenixbox/mayk
        console.log('**** REPO URL: ', repo.url);
        var masterRefURL = [repo.url, '/git/refs/heads/master'].join('');
        var authedBranchUrl = internals.authenticate(masterRefURL, token);

        request.del(authedBranchUrl)
                .then(function(resp) {
                  if (resp.status === 204) {
                    console.log('DELETED MASTER BRANCH: ', arguments);
                    innerCB(null, repo)
                  } else {
                    innerCB(resp.status, null)
                  }
                }, function(err) {
                  console.log('Master branch delete ERROR: err: ', err);
                  innerCB(err, null)
                });
      }
    ], function(err, repo) {
      if (err) {
        cb(err, null)
      } else {
        cb(null, repo)
      }
    });
    return
  },
  authGet: function(uri, params) {
    console.log('**** AUTHENTICATION GET');
    return request.get(uri)
                  .send(params)
                  .set('Accept', 'application/vnd.github.v3+json')
                  .set('Accept', 'application/vnd.github.moondragon+json')
  },
  findOrCreateRepo: function(github, username, token, cb) {
    var params = internals.repoGetParams(username);

    return github.repos.get(params, function(err, repo) {
      if (err) {
        return internals.preparePortolioRepo(github, username, token, cb)
      } else {
        cb(null, repo)
      }
    });
  },
  preparePortolioRepo: function(github, username, token, cb) {
    console.log('**** preparePortolioRepo: ', arguments);

    async.waterfall([
      function(innerCB) {
        internals.createRepo(github, username, innerCB)
      },
      function(repo, innerCB) {
        console.log('**** gitAndGHPagesInit REPO: ', repo);
        internals.gitAndGHPagesInit(repo, innerCB);
      },
      function(repo, innerCB) {
        // Requires a delay for gh sake :shruggie:?
        _.delay(function() {
          internals.setGHPagesAsDefault(repo.url, repo.name, repo.owner, token, innerCB)
        }, 2000);
      }
      ], function(err, repo) {
        console.log('**** I should be a CB: ', cb);

        if (err) {
          cb(err, null)
        } else {
          cb(null, repo)
        }
    })
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
    console.log('internal cleanAssets: ', arguments);

    exec('gulp clean\n', function (err, stdout, stderr) {
      internals.logger('clean assets: ', err, stdout, stderr);
      cb(null, {});
    });
  },
  cleanSedResult: function(cb) {
    exec('gulp cleanSedResult\n', function (err, stdout, stderr) {
      internals.logger('clean cleanSedResult: ', err, stdout, stderr);
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
  publishAssets: function(username, data, cb) {
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
        Prefix: username
      },
      recursive: false
    };
    /*
      Memoise the asset list
    */
    var assetList = [];
    var listObj = client.listObjects(params);
    listObj.on('data', function(data) {
      assetList = assetList.concat(data.Contents);
    });
    listObj.on('end', function(err, data) {
      console.log('listObjects arguments: ', arguments);
      console.log('CONTENTS: ', assetList);

      if (err) {
        cb(err, null)
      } else {
        cb(null, assetList)
      }
    });
  },
  getSignedUrls: function(files, cb) {
    // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/S3.html#getSignedUrl-property
    // https://mayk-portfolios.s3-us-west-1.amazonaws.com/phoenixbox/mayk-phoenixbox.min.js?AWSAccessKeyId=${KEY}&Expires=${EXP}&Signature=${SIG}
    console.log('THERE ARE 2 FILES', files.length);

    var s3sdk = new AWS.S3({
      accessKeyId: awsCreds.key,
      secretAccessKey: awsCreds.secret,
      region: 'us-west-1'
    })

    var ONE_YEAR_SECS = 60 * 60 * 24 * 365 * 2;
    var client = internals.s3Client();
    var fileCounter = 0;

    var signedUrls = [];
    _.each(files, function(file, i) {
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
        fileCounter++;
        signedUrls = signedUrls.concat(url);
        console.log('AFTER ADD: ' + signedUrls.length);

        if (err) {
          console.log('ERROR: signedUrl: ' + err);
        }
        console.log('Fetched URL: ' + url);

        if (fileCounter === files.length) {
          console.log('RESULT SIGNED URLS', signedUrls);
          cb(null, signedUrls);
        }
      });
    })
  },
  replaceAssetRefs: function(signedUrls, cb) {
    console.log('SIGNED LENGTH ****: ', signedUrls.length); // expect these to have hookable ext

    var urls = internals.parseUrls(signedUrls);
    var pairs = internals.buildPairs(urls);

    var replaceCommands = _.map(pairs, function(pair, i) {
      return internals.replaceCommands(pair, i);
    })
    console.log('REPLACE COMMANDS: ', replaceCommands);

    var replaceCounter = 0;
    _.each(replaceCommands, function(command) {
      exec(command, function (err, stdout, stderr) {
        internals.logger('replace w/asset signed url: ', err, stdout, stderr);
        replaceCounter++;

        if (replaceCounter === replaceCommands.length) {
          cb(null, {});
        }
      });
    })
  },
  buildPairs: function(urls) {
    return [{
      target: 'maykPortfolioStyles',
      url: urls.css
    },
    {
      target: 'maykPortfolioScript',
      url: urls.js
    }];
  },
  parseUrls: function(urls) {
    return _.reduce(urls, function(result, url) {
      if (new RegExp(".min.js?").test(url)) {
        result['js'] = url;
      } else if (new RegExp(".min.css?").test(url)) {
        result['css'] = url;
      }

      return result;
    }, {})
  },
  replaceCommands: function(pair, index) {
    /*
      Navigate reliably to the right dir: cd ${APP_ROOT}/temp;sed "s/${target}/${replacement}/g" temp/template.html > temp/index.html
      use the | as a delimeter as the url argument has slashes
      0: replace and create the index file from the template
      1: replace again and save the updated index file
    */
    var navToAppRoot = ["cd ", APP_ROOT, "/../../temp;"].join('');

    if (index === 0) {
      return [navToAppRoot, "sed \"s|", pair.target, "|", pair.url, "|g\"", " ./template.html > ./index.html"].join('');
    } else if (index === 1) {
      return [navToAppRoot, "sed -i -e \"s|", pair.target, "|", pair.url, "|g\"", " ./index.html"].join('');
    }
  },
  urlForExt: function(url, ext) {
    var extMatch = ".min." + ext;
    var assetMatches = url.match(new RegExp(extMatch));

    if (assetMatches) {
      if (assetMatches.length === 1) {
        return assetMatches[0];
      } else {
        throw new Error('Found too many signed asset urls with ext: ',ext);
      }
    } else {
      throw new Error('Cant find signed asset url with ext: ',ext);
    }
  },
  gitAndGHPagesInit: function(repo, cb) {
    var repoURL = repo.url;
    var sshURL = repo.ssh_url;

    terminal.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });

    terminal.on('exit', function (code) {
      if (code == 0) {
        console.log('***** gitAndGHPagesInit SUCCESS')
        cb(null, repo)
      } else {
        console.log('***** gitAndGHPagesInit FAIL ', code)
        cb(code, null)
      }
    });
    terminal.stdin.write('mkdir ./temp\n');
    terminal.stdin.write('cp -a ./tempBase/. ./temp/\n'); // copyContents of base directory to ./temp
    terminal.stdin.write('cd ./temp\n'); // Assuming location is project root
    var createRepoCommand = './gitAndGHPagesInit.sh ' + sshURL + '\n';
    terminal.stdin.write(createRepoCommand);
    terminal.stdin.write('ls -repo, la\n'); // To verify that the gulped assets are there
    terminal.stdin.write('uptime\n');
    terminal.stdin.end();
  },
  pushRepoUpdates: function(data, cb) {
    terminal.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });

    terminal.on('exit', function (code) {
      if (code == 0) {
        console.log('***** PUSH SUCCESS ', repo)
        cb(null, data)
      } else {
        console.log('***** PUSH FAIL ', code)
        cb(code, null)
      }
    });
    var timeNow = moment().format('llll');
    var createRepoCommand = './pushRepoUpdates.sh ' + timeNow + '\n';
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
    var portfolioName = "mayk";
    var homepage = ["https://",username,".github.io/", portfolioName].join('');

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
