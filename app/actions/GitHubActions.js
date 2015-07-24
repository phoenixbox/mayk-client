var AppDispatcher = require('../dispatchers/AppDispatcher');
var GitHubConstants = require('../constants/GitHubConstants');
var ActionTypes = GitHubConstants.ActionTypes;

module.exports = {
  init(github) {
    AppDispatcher.dispatch({
      type: ActionTypes.INIT,
      github
    })
  },
};
