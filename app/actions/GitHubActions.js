import AppDispatcher from '../dispatchers/AppDispatcher';
import GitHubConstants from '../constants/GitHubConstants';
import GithubStore from '../stores/GithubStore';
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
    // TODO: The right place to do this state update?
    GithubStore.startLoading();
    GitHubService.publish(github).then(function(res) {
      GithubStore.stopLoading();
      if (res.status === 200) {
        AppDispatcher.dispatch({
          type: ActionTypes.PUBLISHED_PORTFOLIO,
        })
      }
    })
  },
};
