var _ = require('lodash');
var config = require('config');
var helpers = require('./helpers.js');

var github_api_root = 'https://github.com';
https://github.com/login/oauth/authorize
var githubConfig = {
  protocol: 'oauth2',
  auth: github_api_root + '/login/oauth/authorize',
  token: github_api_root + '/api/oauth.access',
  scope: ['identify','read','post','client'],
  scopeSeparator: ',',
  profile: function (credentials, params, get, callback) {
    var profileUrl = github_api_root + '/api/auth.test';

    get(profileUrl, { token: credentials.token }, function(profile) {
      if (!profile.ok) {
        throw new Error('Error getting Slack profile: ' + profile.error);
      }

      credentials.profile = {
        team: profile.team,
        user: profile.user,
        user_id: profile.user_id,
        team_id: profile.team_id
      };

      return callback();
    })
  }
};

exports.register = function(server, options, next) {
  server.register([
    require('hapi-auth-cookie'),
    require('bell')
  ], function(err) {
    if (err) {
      throw err;
    }

    var isSecure = process.env.NODE_ENV === 'production';

    server.auth.strategy('session', 'cookie', {
      cookie: 'mayk',
      password: config.cookie_password,
      redirectTo: '/login',
      isSecure: isSecure,
      ttl: 31540000000
    });

    server.auth.strategy('github', 'bell', {
      isSecure: isSecure,
      provider: githubConfig,
      password: config.cookie_password,
      clientId: config.github_client_id,
      clientSecret: config.github_client_secret,
      redirect_uri: config.mayk_redirect_uri,
      cookie: 'bell-github'
    });

    server.route([
      {
        method: ['GET', 'POST'],
        path: '/login',
        config: {
          auth: 'github',
          handler: function(request, reply) {
            if (!request.auth.isAuthenticated) {
              return reply('Authentication failed due to: ' + request.auth.error.message);
            } else {
              console.log('GITHUB AUTH SUCCESSFUL!: ', request.auth.credentials);
            }
            request.auth.session.set(request.auth.credentials);

            var gitHubProfile = request.auth.credentials.profile;
            var token = request.auth.credentials.token;
            // var userId = request.state.partyline.profile.id;
            // var slackProfile = request.auth.credentials.profile;

            // Control callback to FE redirect when successful response from server
            server.methods.saveGithubProfile(userId, gitHubProfile, token, function(err) {
              if (err) {
                return reply('Error saving sessions');
              }
              reply.redirect('/profile');
            });
          }
        }
      },
      {
        method: 'GET',
        path: '/logout',
        config: {
          auth: 'session'
        },
        handler: function(request, reply) {
          request.auth.session.clear();
          reply.redirect('/');
        }
      }
    ]);

    next();
  });

};

exports.register.attributes = {
  name: 'oauth',
  version: '0.0.1'
};
