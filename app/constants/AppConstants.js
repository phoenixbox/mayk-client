var keyMirror = require('keymirror');
// There may be an env prob here - may need to envify
// var helpers = require('../../lib/helpers/');
// TODO: update when env setup
var APIRoot = process.env === 'production' ? 'http://127.0.0.1:3000' : 'https://mayk-staging.herokuapp.com';

module.exports = {

  APIEndpoints: {
    LOGIN:          APIRoot + "/v1/login",
  },

  PayloadSources: keyMirror({
    SERVER_ACTION: null,
    VIEW_ACTION: null
  }),

  ActionTypes: keyMirror({
    // Session
    INIT: null,
    LOGIN_REQUEST: null,
    LOGIN_RESPONSE: null,

    // Routes
    REDIRECT: null,

    LOAD_COMMITS: null,
    RECEIVE_STORIES: null,
    LOAD_STORY: null,
    RECEIVE_STORY: null,
    CREATE_STORY: null,
    RECEIVE_CREATED_STORY: null
  })

};
