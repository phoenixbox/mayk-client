var _ = require('lodash');
var request = require('request');
var config = require('config');
var request = require('superagent-bluebird-promise');
var helpers = require('../helpers.js');

exports.register = function(server, options, callback) {

  server.method('saveUserGitHubAccount', function(token, account, next) {
    var usersURL = helpers.rootURL(config.env) + '/v1/users';

    var params = {
      token: token,
      account: account,
      provider: 'github'
    }

    request.post(usersURL)
      .send({user: params})
      .set('Accept', 'application/json')
      .then(function(res) {
        if (res.error) {
          next(true, null);
        } else {
          next(null, res.body);
        }
      });
  });

  callback();
};

exports.register.attributes = {
  name: 'api-user',
  version: '0.0.1'
};


/* GitHubAccount Response Shape
token: '16860027048e98facf4e0f2efb3a0ac154c81d4c',
profile:
 {
  id: 2892213,
  username: 'phoenixbox',
  displayName: 'Shane Rogers',
  email: 'srogers@quickleft.com',
  raw: { login: 'phoenixbox' ... }
  }
*/

// curl localhost:3002/v1/login --data "email=user@example.com=user&user[password]=password"
// {
//   "token_type": "Bearer",
//   "user_id": 1,
//   "access_token": "1:MPSMSopcQQWr-LnVUySs"
// }

// User.create!({:email => "srogers@quickleft.com", :uuid => "", :password => "11111111", :username => 'phoenixbox', :password_confirmation => "11111111" })
