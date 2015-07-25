var AppDispatcher = require('../dispatchers/AppDispatcher.js');
var SessionAPI = require('../lib/API/session.js');
var SessionConstants = require('../constants/SessionConstants.js')
var SessionStore = require('../stores/SessionStore.js')

function _getErrors(res) {
  var errorMsgs = ["Something went wrong, please try again"];
  if ((json = JSON.parse(res.text))) {
    if (json['errors']) {
      errorMsgs = json['errors'];
    } else if (json['error']) {
      errorMsgs = [json['error']];
    }
  }
  return errorMsgs;
}

module.exports = {
  init: function() {
    let access_token = SessionStore.getAccessToken() || __access_token;

    SessionAPI.login(__uuid, access_token).then(function(res) {
      if (res.error) {
        var errorMsgs = _getErrors(res);
        AppDispatcher.dispatch({
          actionType: SessionConstants.LOGIN_ERROR,
          payload: errorMsgs
        });
      } else {
        /* Response Keys
          "access_token":
          "uuid":
          "token_type":
          "user_id":
          "github_username":
          "github_email":
          "github_display_name":
          "github_oauth_token":
        */

        AppDispatcher.dispatch({
          actionType: SessionConstants.LOGIN,
          payload: res.body
        });
      }
    });
  },

  logout: function() {
    SessionAPI.logout().then(function(res) {
      console.log('Logged Out');
      if (res.status === 200) {
        AppDispatcher.dispatch({
          actionType: SessionConstants.LOGOUT
        });
      } else {
        AppDispatcher.dispatch({
          actionType: SessionConstants.LOGOUT_ERROR
        });
      }
    });
  }
};
