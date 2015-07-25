import AppDispatcher from '../dispatchers/AppDispatcher';
import AppConstants from '../constants/AppConstants';
import _ from 'lodash';

import {EventEmitter} from 'events';
import assign from 'object-assign';

import SessionConstants from '../constants/SessionConstants.js';
import GitHubActions from '../actions/GitHubActions';
import {GitHubStore} from '../stores/GitHubStore';
var CHANGE_EVENT = 'change';

// Load an access token from the session storage, you might want to implement
// a 'remember me' using localSgorage
// TODO: Where does sessionStorage come from?
var _user = {};
var _github = {};
var _errors = [];

var SessionStore = assign({}, EventEmitter.prototype, {

  emitChange: function() {
    console.log('EMIT SESSION CHANGED');
    this.emit(CHANGE_EVENT);
  },

  addChangeListener: function(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener: function(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  isLoggedIn: function() {
    return (_user && _user.access_token) ? true : false;
  },

  getAccessToken: function() {
    if (_user && _user.access_token) {
      return _user.access_token;
    } else {
      return '';
    }
  },

  getCurrentUser() {
    return _user;
  },

  getGithub() {
    return _github;
  },

  getEmail: function() {
    if (_user && _user.email) {
      return _user.email;
    } else {
      return ''
    }
  },

  getErrors: function() {
    return _errors;
  }

});

SessionStore.dispatchToken = AppDispatcher.register(function(action) {
  // Store the token sent back in from the hapi redirect to the profile
  switch(action.actionType) {

    case SessionConstants.LOGIN:
      var user = internals.extractUser(action.payload)
      var github = internals.extractGithub(action.payload)

      if (internals.isValid(user) && internals.isValid(github)) {
        _user = user;
        _github = github;
      }
      if (action.errors) {
        _errors = action.errors;
      }
      /*
        Why getting called twice?
        Hack to avoid 2dispatches at the same time
      */
      console.log('*** Github init in session ***')
      if (!GitHubStore.isLoading()) {
        _.delay(GitHubActions.init, 1000, github);
      }

      SessionStore.emitChange();
      break;

    case SessionConstants.LOGOUT:
      _accessToken = null;
      _email = null;
      sessionStorage.removeItem('accessToken');
      sessionStorage.removeItem('email');
      SessionStore.emitChange();
      break;

    case SessionConstants.SESSION_ERROR:
      console.log('HANDLE THE SESSION ERROR');

    default:
  }

  return true;
});

var internals = {
  extractUser: function(payload) {
    var userAttrs = ['access_token', 'uuid', 'token_type', 'user_id'];
    return internals.extract(userAttrs, payload);
  },

  isValid: function(object) {
    var result = true;

    for (var key in object) {
      if (object[key] == false) {
        result = false;
        break;
      }
    }

    return result;
  },

  extractGithub: function(payload) {
    var githubAttrs = ['github_username', 'github_email', 'github_display_name', 'github_oauth_token'];
    return internals.extract(githubAttrs, payload);
  },

  extract: function(attrs, payload) {
    return _.reduce(payload, function(memo, val, key) {
      if(_.contains(attrs, key)) {
        memo[key] = val;
      }

      return memo;
    }, {});
  }
}

module.exports = SessionStore;
module.exports.internals = internals;
