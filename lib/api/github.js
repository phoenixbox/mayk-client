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
var CURRENT_DIR = path.resolve(__dirname);
var moment = require('moment');

exports.register = function(server, options, callback) {
  // Pass through the client payload
  server.method('findOrCreateMaykRepo', function(payload, next) {
    var token = payload.github_oauth_token;
    var username = payload.github_username;

    var github = new GitHubApi({
      version: "3.0.0",
    });
    github.authenticate({
      type: "oauth",
      token: token
    });

    async.waterfall([
      function(callback) {
        internals.cleanAssets(null, callback);
      },
      function(data, callback) {
        internals.findOrCreateRepo(github, username, token, callback);
      },
      function(data, callback) {
        internals.cleanAssets(data, callback);
      },
      async.apply(internals.cloneRepo, username, token),
      async.apply(internals.createJSDir),
      async.apply(internals.buildJS, username),
      async.apply(internals.buildCSS, username),
      async.apply(internals.publishAssets, username),
      async.apply(internals.listAssets, username),
      async.apply(internals.getSignedUrls),
      async.apply(internals.replaceAssetRefs),
      async.apply(internals.cleanBuiltAssets),
      async.apply(internals.pushRepoUpdates)
    ], function(err, repo) {
      if (err) {
        internals.logger('findOrCreateMaykRepo: ', err);
        next(err, null)
      } else {
        next(err, {});
      }
    });
  });

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
    var authedGHBranchURL = internals.authenticate(url, token);
    var params = _.extend(internals.repoCRUDParams(owner.login),{"default_branch": "gh-pages"})

    async.waterfall([
      // Set GHPages as default branch
      function(innerCB) {
        request.patch(authedGHBranchURL)
                .send(params)
                .then(function(resp) {
                  // Pass back the repo in the body of response
                  innerCB(null, resp.body)
                }, function(err) {
                  console.log('GHPages default ERROR: err: ', err);
                  innerCB(err, null)
                });
      },
      // Delete the master branch using refs API - /repos/phoenixbox/mayk
      function(repo, innerCB) {
        var masterRefURL = [repo.url, '/git/refs/heads/master'].join('');
        var authedBranchUrl = internals.authenticate(masterRefURL, token);

        request.del(authedBranchUrl)
                .then(function(resp) {
                  if (resp.status === 204) {
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
    async.waterfall([
      function(innerCB) {
        internals.createRepo(github, username, innerCB)
      },
      function(repo, innerCB) {
        internals.gitAndGHPagesInit(repo, innerCB);
      },
      function(repo, innerCB) {
        // Timeout for GitHub sake
        _.delay(function() {
          internals.setGHPagesAsDefault(repo.url, repo.name, repo.owner, token, innerCB)
        }, 5000);
      }
      ], function(err, repo) {
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
        internals.logger('createRepo: ', err);
        cb(err, null)
      } else {
        cb(null, repo)
      }
    });
  },
  cleanAssets: function(data, cb) {
    exec('gulp clean\n', function (err, stdout, stderr) {
      internals.logger('clean assets: ', err, stdout, stderr);
      cb(null, {});
    });
  },
  cloneRepo: function(username, token, data, cb) {
    // Clone into temp with oAuth token and expansion to current directory
    var REPO_CLONE = "mkdir ./temp;cd ./temp;git clone https://"+username+":"+token+"@github.com/" + username + "/mayk .\n";

    exec(REPO_CLONE, function (err, stdout, stderr) {
      internals.logger('REPO_CLONE: ', err, stdout, stderr);
      cb(null, {});
    });
  },
  cleanBuiltAssets: function(data, cb) {
    exec('gulp cleanBuiltAssets\n', function (err, stdout, stderr) {
      internals.logger('clean cleanBuiltAssets: ', err, stdout, stderr);
      cb(null, {});
    });
  },
  createJSDir: function(data, cb) {
    var createJSDir = "cd ./temp;mkdir js\n";

    exec(createJSDir, function (err, stdout, stderr) {
      internals.logger('build js: ', err, stdout, stderr);

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
  // gulp publishAssets - https://s3-us-west-1.amazonaws.com/${bucketName}/${tagname}
  publishAssets: function(username, data, cb) {
    var oneYrCache = 60 * 60 * 24 * 365;
    // TODO: Update with filenameKey(username)
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
  /*
    Nav to temp dir - cd .../temp
    First command includes action to ./template.html > ./index.html
    Replace script tag --> sed -i -e "s|${target}|${value}|g" ./index.html
  */
  replaceAssetRefs: function(signedUrls, cb) {
    var urls = internals.parseUrls(signedUrls);
    var pairs = internals.buildPairs(urls);

    var replaceCommands = _.map(pairs, function(pair, i) {
      return internals.replaceCommands(pair, i);
    })

    var replaceCounter = 0;
    _.each(replaceCommands, function(command) {
      exec(command, function (err, stdout, stderr) {
        internals.logger('replace w/asset signed url: ', err, stdout, stderr);
        replaceCounter++;

        if (replaceCounter === replaceCommands.length) {
          _.delay(function() {
            cb(null, {});
          }, 5000);
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
      Navigate reliably to the right dir: cd ${CURRENT_DIR}.../temp;sed "s/${target}/${replacement}/g" temp/template.html > temp/index.html
      use the | as a delimeter as the url argument has slashes
      0: replace and create the index file from the template
      1: replace again and save the updated index file
    */
    var navToAppRoot = ["cd ", CURRENT_DIR, "/../../temp;"].join('');

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
        cb(null, repo)
      } else {
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
    var timeNow = moment().format('llll');
    var navToTempRoot = ["cd ", CURRENT_DIR, "/../../temp;"].join('');
    var pushUpdates = './pushRepoUpdates.sh ' + timeNow + '\n';
    var fullCommand = navToTempRoot + pushUpdates;

    exec(fullCommand, function (err, stdout, stderr) {
      internals.logger('PUSH REPO UPDATES: ', err, stdout, stderr);

      cb(null, {});
    });
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
      console.log(processName + ' ERR', err);
    }
    if (stdout) {
      console.log(processName + ' STDOUT', stdout);
    }
    if (stderr) {
      console.log(processName + ' STDERR', stderr);
    }
  },
  whereAmi: function() {
    console.log('CURRENT_DIR: ', CURRENT_DIR);
  }
}

module.exports.internals = internals;
