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
    // var token = token;
    // var username = profile.username;
    var token = '16860027048e98facf4e0f2efb3a0ac154c81d4c';
    var username = 'phoenixbox';
    var reponame = "mayk-" + username;

    var github = new GitHubApi({
      version: "3.0.0",
    });
    github.authenticate({
        type: "oauth",
        token: token
    });

    var userPorfolioRepo = {user: username, repo: reponame};

    github.repos.get(userPorfolioRepo, function(err, repo) { // find the repo
      if (err) { // create one
        console.log('userPorfolioRepo: ', err)
      } else {
        // Get the ref sha to branch from
        var refsURL = "https://api.github.com/repos/"+username+"/"+reponame+"/git/refs/heads";
        var params = {access_token: token}

        internals.authGet(refsURL, params).then(function(err, result) {
          console.log('REFS REQUEST: ', arguments);
          if (err) {

          } else {

          }
        }, function(error) {
          console.log('HOME PROCESS***:', process.env.HOME);
          console.log('DIRPATH ***:', path.join(__dirname, '../../temp')); // Valid
          var filePath = path.join(__dirname, '../../temp');

          terminal.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
          });

          terminal.on('exit', function (code) {
            console.log('child process exited with code ' + code);
          });
          // /Users/shanerogers/projects/mayk/mayk-client
          setTimeout(function() {
              console.log('Sending stdin to terminal');
              terminal.stdin.write('chmod a+x ./utils/github/createRepo.sh\n');
              terminal.stdin.write('./utils/github/createRepo.sh"\n');
              terminal.stdin.write('uptime\n');
              console.log('Ending terminal session');
              terminal.stdin.end();
          }, 1000);

          // child_process.execFile('ls', ['-lha', filePath], function(err, out, code) {
          //   if (err instanceof Error)
          //     throw err;
          //   process.stderr.write(err);
          //   process.stdout.write(out);
          //   process.exit(code);
          // });

          // spawn('sh', [ '../../utiles/github/createRepo.sh' ], {
          //   cwd: process.env.HOME + '/projects/mayk/mayk-client/lib/api',
          //   env:_.extend(process.env, { PATH: process.env.PATH + ':/usr/local/bin' })
          // });
        });
      }
    })

    // github.repos.create(userPorfolioRepo, function(err, repo) { // create the repo
    //   if (err) {
    //     // get the revision hash https://api.github.com/repos/<AUTHOR>/<REPO>/git/refs/heads
    //     next(null, {})
    //   } else {
    //
    //
    //   }
    // })
    // next(null, {})
    //
    //
    // gh.getRepo(username, reponame).then(function(repo) {
    //   console.log('*** GITHUB REPO REQUEST ***: ', arguments);
    //
    //   if (repo) {
    //     // Maybe its all good
    //     console.log('Repo exists: ', repo);
    //   } else {
    //     // create a repo POST /user/repos
    //     // post to this https://api.github.com/repos/<AUTHOR>/<REPO>/git/refs
    //     /*
    //       {
    //         "ref": "refs/heads/<NEW-BRANCH-NAME>",
    //         "sha": "<HASH-TO-BRANCH-FROM>"
    //       }
    //     */
    //     //  now push all files in a directory to github
    //     console.log('Repo doesnt exist');
    //   }
    // });

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
  authGet: function(uri, params) {
    console.log('**** AUTHENTICATION GET');
    return request.get(uri)
                  .send(params)
                  .set('Accept', 'application/vnd.github.v3+json')
                  .set('Accept', 'application/vnd.github.moondragon+json')
  },
  createRepo: function(token, profile, next) {
  }
}

module.exports.internals = internals;
