var assert = require('chai').assert;
var SessionStore = require('../../../app/stores/SessionStore.js');
import _ from 'lodash';

describe('#SessionStore', function () {
  describe('#internals', function () {
    describe('#extractUser', function () {
      it('extracts all user attrs', function () {
        var target = {
          access_token: 'access_token',
          uuid: 'uuid',
          token_type: 'token_type',
          user_id: 'user_id'
        }

        var payload = _.extend(_.cloneDeep(target), {no: 1})

        var result = SessionStore.internals.extractUser(payload);

        assert.deepEqual(result, target);
      })
    })

    describe('#github', function () {
      it('extracts all github attrs', function () {
        var target = {
          github_username: 'github_username',
          github_email: 'github_email',
          github_display_name: 'github_display_name',
          github_oauth_token: 'github_oauth_token'
        }

        var payload = _.extend(_.cloneDeep(target), {no: 1})

        var result = SessionStore.internals.extractGithub(payload);

        assert.deepEqual(result, target);
      })
    })

    describe('#isValid', function () {
      it('returns true when it has values for its keys', function () {
        var validObject = {key: 'key', key2: 'key2'}
        assert.isTrue(SessionStore.internals.isValid(validObject))
      });

      it('returns false when it is missing a values for its keys', function () {
        var invalidObject = {key: 'key', key2: ''}
        assert.isFalse(SessionStore.internals.isValid(invalidObject))
      });
    });

    describe('#extract', function () {
      it('extracts all specified attrs', function () {
        var payload = {
          'a': 1,
          'b': 2,
          'c': 3
        }

        var target = {
          'a': 1,
          'b': 2
        }

        var attrs = ['a', 'b'];
        var result = SessionStore.internals.extract(attrs, payload);

        assert.deepEqual(result, target);
      })
    })
  })
})
