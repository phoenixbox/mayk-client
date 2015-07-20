var assert = require('chai').assert;
var server = require('../server.js');
var _ = require('lodash');

describe('#server', function () {
  describe('#viewVars', function () {
    describe('not authenticated', function () {
      it('passes path & no credentials', function () {
        var request = {auth: {}}
        var target = {
          pathname: '/path',
          token: false
        }
        var result = server.internals.viewVars('path', request)

        assert.deepEqual(result, target);
      });
    });

    describe('authenticated', function () {
      it('passes path & credentials', function () {
        var request = {
          auth: {
            credentials: {
              token: 'token',
              profile: {
                email: 'email'
              }
            }
          }
        }
        var target = {
          pathname: '/path',
          token: 'token',
          email: 'email'
        }
        var result = server.internals.viewVars('path', request)

        assert.deepEqual(result, target);
      });
    });
  })

  describe('#pluckAuthAttrs', function () {
    it('takes only the whitelisted attrs', function() {
      var target = {
        'email': 'A',
        'username': 'B',
        'displayName': 'C',
        'access_token': 'D',
        'uuid': 'E',
        'token_type': 'F',
        'user_id': 'G',
        'token': 'H'
      }

      var data = _.cloneDeep(target)
      _.extend(data, {'REMOVE': 'invalid'})

      var result = server.internals.pluckAuthAttrs(data);

      assert.deepEqual(result, target);
    })
  })
})
