var AppDispatcher = require('../dispatchers/AppDispatcher');
var GitHubConstants = require('../constants/GitHubConstants');
var ActionTypes = GitHubConstants.ActionTypes;

module.exports = {
  init(user) {
    AppDispatcher.dispatch({
      type: ActionTypes.INIT,
      user
    })
  },
};
