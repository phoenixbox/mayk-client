import _ from 'lodash';
import AppDispatcher from '../dispatchers/AppDispatcher';
import {EventEmitter} from 'events';
import UserConstants from '../constants/UserConstants'
let ActionTypes = UserConstants.ActionTypes;
import Promise from  'bluebird'
import request from 'superagent-bluebird-promise';
const CHANGE_EVENT = 'change';

let BASE_URL = process.env.NODE_ENV === 'production' ? 'https://mayk-staging.herokuapp.com' : 'http://127.0.0.1:3000';

var internals = {
};

var _currentUser = {};

var UserStore = _.assign({}, EventEmitter.prototype, {
  clearCurrentUser() {
    debugger
    _currentUser = {};
  },

  getCurrentUser() {
    return _currentUser;
  },

  setCurrentUser(user) {
    _currentUser = user;

    return _currentUser;
  },

  emitChange() {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  signOut() {
    request.post(`${BASE_URL}/signout`)
      .set('Access-Control-Allow-Origin', '*')
      .then(function(resp) {
        debugger
        if (resp.status == 200 || resp.status == 204) {
          UserStore.clearCurrentUser();
          // Hard reset of route to decouple from ReactRouter
          window.location.href = '/';
        } else {
          debugger
          return new Promise(function(resolve, reject) {
            console.error('fucked')
            reject('reject')
          })
        }
      })
  }
});
//   Should be implemented and hit from the profile route
//   case ActionTypes.SET_CURRENT_USER:
//   isLoading = true;
//   UserStore.emitChange();
//   break;

UserStore.dispatchToken = AppDispatcher.register(function(action) {
  switch(action.type) {
    case ActionTypes.SIGN_OUT:
      UserStore.signOut();
      break;

    default:
  }
});

module.exports.UserStore = UserStore;

module.exports.internals = internals;
