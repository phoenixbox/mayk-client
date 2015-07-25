var _ = require('lodash');
var config = require('config');
var GITHUB_USER = 'https://api.github.com/user';
var Qs = require('qs');

var githubConfig = {
  protocol: 'oauth2',
  auth: 'https://github.com/login/oauth/authorize',
  token: 'https://github.com/login/oauth/access_token',
  scope: [
    'user',
    'public_repo',
    'repo',
    'repo:status',
    'read:org',
    'read:public_key',
    'delete_repo'
  ],
  scopeSeparator: ',',
  headers: { 'User-Agent': 'hapi-bell-github' },
  profile: function (credentials, params, get, callback) {
    get(GITHUB_USER, null, function (profile) {
      credentials.profile = {
          id: profile.id,
          username: profile.login,
          displayName: profile.name,
          email: profile.email,
          raw: profile
      };

      return callback();
    });
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
      redirectTo: '/auth/github',
      isSecure: isSecure,
      ttl: 31540000000
    });

    server.auth.strategy('github', 'bell', {
      provider: githubConfig,
      isSecure: isSecure,
      password: config.cookie_password,
      clientId: config.github_client_id,
      clientSecret: config.github_client_secret,
      cookie: 'bell-github'
    });

    server.route([
      {
        method: ['GET', 'POST'],
        path: '/auth/github',
        config: {
          auth: 'github',
          handler: function(request, reply) {
            console.log('**** GITHUB ****');
            if (!request.auth.isAuthenticated) {
              return reply('Authentication failed due to: ' + request.auth.error.message);
            } else {
              console.log('GITHUB AUTH SUCCESSFUL!: ', request.auth.credentials);
            }
            // Change - add the profile
            // request.auth.session.set(request.auth.credentials);
            request.auth.session.set(request.auth.credentials);

            var token = request.auth.credentials.token;
            var gitHubAccount = request.auth.credentials.profile;

            server.methods.saveUserGitHubAccount(token, gitHubAccount, function(err, body) {
              /* Body Shape
                access_token: '',
                uuid: ''
              */
              if (err) {
                return reply('Error saving github to API');
              }
              _.extend(request.auth.credentials.profile, body);

              reply.redirect('/profile');
            });
          }
        }
      },
      {
        method: 'GET',
        path: '/logout',
        handler: function(request, reply) {
          request.auth.session.clear();

          if (request.query.source === 'client') {
            reply('ok')
          } else {
            reply.redirect('/');
          }
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
