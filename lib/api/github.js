var _ = require('lodash');
var config = require('config');
var request = require('superagent-bluebird-promise');
var helpers = require('../helpers.js');
var swig = require('swig');
var mkdirp = require('mkdirp');
var GitHubApi = require("github");
var fs = require('fs');
var _ = require('lodash');
var path = require('path');
var async = require('async');
var spawn = require('child_process').spawn;
// var exec = require('child_process').execFile;
var child_process = require('child_process');
var terminal = require('child_process').spawn('bash');

exports.register = function(server, options, callback) {

  server.method('findOrCreateMaykRepo', function(token, profile, next) {
    var token = token;
    var username = profile.username;
    // Mock keys here for easy access

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
    //   push minified js to S3 - ref in callback
    //   replace the js script in ./index.html with the min script ref
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
      function(callback) {
        internals.findOrCreateRepo(github, username, callback);
      },
      function(repo, callback) {
        internals.gitAndGHPagesInit(repo, callback);
      },
      function(repo, callback) {
        internals.setGHPagesAsDefault(repo.url, repo.name, repo.owner, token, callback)
      }
    ], function(err, repo) {
      if (err) {
        next(err, null)
      } else {
        next(err, {repo: repo});
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
  setGHPagesAsDefault: function(url, repo, owner, token, cb) {
    var authedURL = internals.authenticate(url, token);
    console.log('PATCH REQUEST: ', authedURL);

    var params = _.extend(internals.repoCRUDParams(owner.login),{"default_branch": "gh-pages"})

    return request.patch(authedURL)
                  .send(params)
                  .then(function(repo) {
                      console.log('GHPages is DEFAULT');
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
  findOrCreateRepo: function(github, username, cb) {
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
  gitAndGHPagesInit: function(repo, cb) {
    console.log('GITANDGHPAGESINIT ***: ');
    var repoURL = repo.url;
    console.log('REPO_URL: ' + repoURL);
    var sshURL = repo.ssh_url;
    console.log('SSH_URL: ' + sshURL);

    terminal.stdout.on('data', function (data) {
      console.log('stdout: ' + data);
    });

    terminal.on('exit', function (code) {
      if (code == 0) {
        console.log('***** SCUCESSFUL PUSH ', repo)
        cb(null, repo)
      } else {
        console.log('***** FAILED PUSH ', code)
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
  }
}

module.exports.internals = internals;
