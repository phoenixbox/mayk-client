var AppDispatcher = require('../dispatchers/AppDispatcher');
var UserConstants = require('../constants/UserConstants');
var ActionTypes = UserConstants.ActionTypes;

module.exports = {
  signOut() {
    AppDispatcher.dispatch({
      type: ActionTypes.SIGN_OUT
    })
  }
};
