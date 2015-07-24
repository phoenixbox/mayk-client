var AppDispatcher = require('../dispatchers/AppDispatcher.js');
var SessionAPI = require('../lib/API/session.js');
var SessionConstants = require('../constants/SessionConstants.js')

module.exports = {
  init: function() {
    SessionAPI.login(__uuid, __access_token).then(function(res) {
      if (res.error) {
        var errorMsgs = _getErrors(res);
        AppDispatcher.dispatch({
          actionType: SessionConstants.SESSION_ERROR,
          payload: err
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
    AppDispatcher.handleViewAction({
      type: ActionTypes.LOGOUT
    });
  },

  // login: function(uuid, accessToken) {
  //   SmallAppDispatcher.handleViewAction({
  //     type: ActionTypes.LOGIN_REQUEST,
  //     uuid,
  //     accessToken
  //   });
  //
  //   SessionAPI.login(uuid, accessToken);
  // }
};
