let _ = require('lodash');
import AppDispatcher from '../dispatchers/AppDispatcher';
import {EventEmitter} from 'events';
import Promise from 'bluebird';
import {GitHubService} from '../services/github.js';

// Mock Data
// import MockCommits from './MockData/commit_activity';
// import MockIndividualCommits from './MockData/formatted_individual';
// import MockOrgs from './MockData/orgs';
// import MockRepos from './MockData/repos';
let MockCommits = {};
let MockIndividualCommits = {};
let MockOrgs = {};
let MockRepos = {};

Promise.promisifyAll(GitHubService);

import GitHubConstants from '../constants/GitHubConstants'
let ActionTypes = GitHubConstants.ActionTypes;

const CHANGE_EVENT = 'change';

let _orgs = [];
let _repos = [];
let _commits = [];
let _individualCommits = [];
let _client = {};

// Utility number for request progress reference
let _commitsForRepoCount = 0;
let _isLoading = false;

let GitHubStore = _.assign({}, EventEmitter.prototype, {
  /**
   * Getters
   */
  userRepos() {
    return _repos;
  },

  userOrgs(){
    return _orgs;
  },

  userCommits() {
    return _commits;
  },

  commitsForRepoCount() {
    return _commitsForRepoCount;
  },

  // TODO: Loading state could be extract to store
  isLoading() {
    return _isLoading;
  },

  startLoading() {
    _isLoading = true;

    this.emitChange();
  },

  stopLoading() {
    _isLoading = false;

    this.emitChange();
  },

  incrementCommitsForRepoCount() {
    _commitsForRepoCount += 1;
  },

  individualCommits() {
    // MOCK POINT
    // _individualCommits = MockIndividualCommits;
    return _individualCommits;
  },

  loadMockData() {
    _repos = MockRepos;
    _orgs = MockOrgs;
    _commits = internals.formatCommitActivity(_repos, MockCommits);

    this.emit(CHANGE_EVENT);
  },

  emitChange() {
    this.emit(CHANGE_EVENT);
  },

  /**
   * @param {} callback
   */
  addChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },

  /**
   * @param {object} user
   */
  getUsersOrgs(github) {
    this.startLoading();
    let _this = this;
    let token = github.github_oauth_token;
    console.log('1 TOKEN: ', token)

    GitHubService.fetchUserOrgs(token)
      .then((result) => {
        _orgs = result;
        _this.emitChange();
      }, function(err) {
        console.log(err);
      })
      .catch((e) => {
        console.log(e.stack);
      })
      .done(() => {
        _this.stopLoading();
        GitHubStore.getOrgRepos(github)
      })
  },

  getUsersRepos(github) {
    this.startLoading();
    let _this = this;
    let token = github.github_oauth_token;
    console.log('2 TOKEN: ', token)

    GitHubService.fetchUserRepos(token)
      .then((result) => {
        _repos = result;
        GitHubStore.emitChange();
      }, (err) => {
        console.log(err);
      })
      .catch((e) => {
        _this.stopLoading();
        console.log(e.stack);
      })
  },

  getOrgRepos(github) {
    this.startLoading();
    let _this = this;
    let token = github.github_oauth_token;
    console.log('3 TOKEN: ', token)

    GitHubService.fetchOrgRepos(_orgs, token)
      .then((result) => {
        _repos = internals.uniqueReposCollection(_repos, result);
        GitHubStore.emitChange();
      }, (err) => {
        console.log(err);
      })
      .catch((e) => {
        console.log(e.stack);
      })
      .done(()=>{
        _this.stopLoading();
        console.log('FETCHED REPOS *** NOW COMMIT ACTIVITY');
        GitHubStore.getCommitActivity(_repos, github);
      })
  },

  receiveFinalCommitRequests(requests) {
    Promise.all(requests)
    .then((results) => {
      _commits = internals.massageCommits(results)
      GitHubStore.emitChange();
    })
  },

  addCommits(commits) {
    _individualCommits = internals.formatIndividualCommits(_individualCommits, commits);

    console.log('EMIT CHANGE FOR NEW: ', _individualCommits.length);
    GitHubStore.emitChange();
  },

  getCommitActivity(repos, github) {
    // #3 Fetch option
    GitHubStore.startLoading();
    GitHubService.fetchCommitsForAllRepos(repos, github, this);
  }
})

GitHubStore.dispatchToken = AppDispatcher.register((action) => {
  switch (action.type) {
    case ActionTypes.INIT:
      // TODO: add an env flag here to toggle between requests and mocks
      // GitHubStore.loadMockData();
      _isLoading = true;
      console.log('Github store init call');
      GitHubStore.getUsersRepos(action.github);
      GitHubStore.getUsersOrgs(action.github);
      // console.log('DONT DO ANYTHING JUST YET');

      // This is mocking _repos = MockRepos;
      // GitHubService.fetchCommitsForAllRepos(_repos, action.user, GitHubStore);
      break;
    case ActionTypes.PUBLISHED_PORTFOLIO:
      // TODO: Have a post back link available to populate view
      console.log('PUBLISHED_PORTFOLIO!')
      GitHubStore.emitChange()
    default:
  }
})

var internals = {
  massageCommits(commits) {
    console.log('TODO massageCommits fn');
  },

  formatIndividualCommits(collection, commits) {
    var parsedCommits = _.map(commits, function(data) {
      let org = internals.extractCommitOrg(data);
      let repo = internals.extractCommitRepo(data);

      return {
        sha: data.sha,
        org: org,
        repo: repo,
        date: data.commit.committer.date
      }
    })

    collection = collection.concat(parsedCommits);
    return _.uniq(collection, 'sha');
  },

  extractCommitOrg(data) {
    let ownerRepo = internals.extractOwnerRepo(data);
    return ownerRepo.split('/')[0];
  },

  extractCommitRepo(data) {
    let ownerRepo = internals.extractOwnerRepo(data);
    return ownerRepo.split('/')[1];
  },

  extractOwnerRepo(data) {
    return data.url.split('https://api.github.com/repos/')[1].split('/commits')[0];
  },

  uniqueReposCollection(existing, fetched) {
    return _.uniq(existing.concat(fetched), 'id')
  },

  userStats(allRepoStats, user) {
    let username = user.github_url.split('https://github.com/')[1];

    var statIndexes = _.map(allRepoStats, function(repoStats, i) {
      if (repoStats) {
        var userStats = _.find(repoStats, function(stat) {
          return stat.author.login === username
        });

        if (userStats) {
          return {
            index: i,
            data: userStats
          }
        }
      }
    })

    return _.chain(statIndexes).compact().flatten().value();
  },

  pruneStats(stat) {
    return _.reduce(stat, function(memo, val, key) {
      if (_.contains(['total', 'weeks'], key)) {
        memo[key] = val;
      }

      return memo;
    }, {});

  },

  // Dont need the user as the request returns commit_activity just for the user
  formatCommitActivity(repos, activity) {

    let validActivity = internals.validCommitActivity(activity);

    return _.map(validActivity, (activity) => {
      var repo = repos[activity.index];

      return {
        repo: repo.name,
        organization: repo.owner.login,
        stats: activity.data
      }
    })
  },

  // would be ideal if the name came back from the request
  validCommitActivity(activity) {
    return _.map(activity, (annualActivity, i) => {
      return {
        index: i,
        data: _.reject(annualActivity, {total: 0})
      }
   })
  },

  formatCommits(repos, allRepoStats, user) {
    let userStats = internals.userStats(allRepoStats, user);
    return _.chain(userStats)
              .map((stat) => {
                  var repo = repos[stat.index];

                  // TODO: Rule out network v Promise based errors
                  if(_.isUndefined(repo)) {
                    console.log('COMMIT MASSAGING ERROR');
                    repo = {
                      name: 'error',
                      owner: {
                        login: 'promise-error'
                      }
                    }
                  }

                  let newStat = internals.pruneStats(stat.data);

                  return {
                    repo: repo.name,
                    organization: repo.owner.login,
                    stats: newStat
                  }
                }
              )
              .compact()
              .value()
  }
}

module.exports = GitHubStore;

module.exports.internals = internals;
// homepage
// Repo url if public
// description
// private
// permissio
