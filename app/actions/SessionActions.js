var AppDispatcher = require('../dispatchers/AppDispatcher.js');
var SessionAPI = require('../lib/API/session.js');
var SessionConstants = require('../constants/SessionConstants.js')

module.exports = {
  init: function() {
    SessionAPI.login(__uuid, __access_token).then(function(error, res) {
      if (res) {
        if (res.error) {
          var errorMsgs = _getErrors(res);
          AppDispatcher.dispatch({
            actionType: SessionConstants.SESSION_ERROR,
            payload: err
          });
        } else {
          // Should be the whole github api
          json = JSON.parse(res.text);
          AppDispatcher.dispatch({
            actionType: SessionConstants.LOGIN,
            payload: json
          });
        }
      }
    });
  },

  logout: function() {
    AppDispatcher.handleViewAction({
      type: ActionTypes.LOGOUT
    });
  },

  login: function(uuid, accessToken) {
    SmallAppDispatcher.handleViewAction({
      type: ActionTypes.LOGIN_REQUEST,
      uuid,
      accessToken
    });

    SessionAPI.login(uuid, accessToken);
  }
};
