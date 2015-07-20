var assert = require('chai').assert;
var helpers = require('../../lib/helpers.js');

describe('#helpers', function () {
  describe('#rootURL', function () {
    it('production', function () {
      var target = 'https://mayk.io';
      var result = helpers.rootURL('production');

      assert.equal(result, target)
    });

    it('staging', function () {
      var target = 'https://mayk-staging.herokuapp.com';
      var result = helpers.rootURL('staging');

      assert.equal(result, target)
    });

    it('development', function () {
      var target = 'http://127.0.0.1:3000';
      var result = helpers.rootURL('development');

      assert.equal(result, target)
    });

    it('test', function () {
      var target = 'http://127.0.0.1:3000';
      var result = helpers.rootURL('test');

      assert.equal(result, target)
    });
  });
});
