import AppDispatcher from '../dispatchers/AppDispatcher';
import GitHubConstants from '../constants/GitHubConstants';
// TODO: This should be import {ActionTypes} - also remove that ActionTypes name?
var ActionTypes = GitHubConstants.ActionTypes;
// TODO: Bad double pattern of service and api
import {GitHubService} from '../services/github.js';

module.exports = {
  init(github) {
    AppDispatcher.dispatch({
      type: ActionTypes.INIT,
      github
    })
  },
  publishPortfolio(github) {
    debugger
    GitHubService.publish(github).then(function(res) {
      AppDispatcher.dispatch({
        type: ActionTypes.PUBLISHED_PORTFOLIO,
      })
    })
  },
};
