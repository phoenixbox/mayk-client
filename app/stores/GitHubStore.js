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
  },

  stopLoading() {
    _isLoading = false;
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
  getUsersOrgs(user) {
    this.startLoading();
    let _this = this;

    GitHubService.fetchUserOrgs(user.token)
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
        GitHubStore.getOrgRepos(user)
      })
  },

  getUsersRepos(user) {
    this.startLoading();
    let _this = this;

    GitHubService.fetchUserRepos(user.token)
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

  getOrgRepos(user) {
    this.startLoading();
    let _this = this;

    GitHubService.fetchOrgRepos(_orgs, user.token)
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
        GitHubStore.getCommitActivity(_repos, user);
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

  getCommitActivity(repos, user) {
    // #3 Fetch option
    GitHubStore.startLoading();
    GitHubService.fetchCommitsForAllRepos(repos, user, this);
  }
})

GitHubStore.dispatchToken = AppDispatcher.register((action) => {
  switch (action.type) {
    case ActionTypes.INIT:
      // TODO: add an env flag here to toggle between requests and mocks
      // GitHubStore.loadMockData();
      // GitHubStore.getUsersRepos(action.user);
      // GitHubStore.getUsersOrgs(action.user);
      console.log('DONT DO ANYTHING JUST YET');

      // This is mocking _repos = MockRepos;
      // GitHubService.fetchCommitsForAllRepos(_repos, action.user, GitHubStore);
      break;
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

module.exports.GitHubStore = GitHubStore;

module.exports.internals = internals;
// homepage
// Repo url if public
// description
// private
// permissions



// Repo signature
// {
//   "id": 780635,
//   "name": "quickleft_v2",
//   "full_name": "quickleft/quickleft_v2",
//   "owner": {
//     "login": "quickleft",
//     "id": 27339,
//     "avatar_url": "https://avatars.githubusercontent.com/u/27339?v=3",
//     "gravatar_id": "",
//     "url": "https://api.github.com/users/quickleft",
//     "html_url": "https://github.com/quickleft",
//     "followers_url": "https://api.github.com/users/quickleft/followers",
//     "following_url": "https://api.github.com/users/quickleft/following{/other_user}",
//     "gists_url": "https://api.github.com/users/quickleft/gists{/gist_id}",
//     "starred_url": "https://api.github.com/users/quickleft/starred{/owner}{/repo}",
//     "subscriptions_url": "https://api.github.com/users/quickleft/subscriptions",
//     "organizations_url": "https://api.github.com/users/quickleft/orgs",
//     "repos_url": "https://api.github.com/users/quickleft/repos",
//     "events_url": "https://api.github.com/users/quickleft/events{/privacy}",
//     "received_events_url": "https://api.github.com/users/quickleft/received_events",
//     "type": "Organization",
//     "site_admin": false
//   },
//   "private": true,
//   "html_url": "https://github.com/quickleft/quickleft_v2",
//   "description": "main site",
//   "fork": false,
//   "url": "https://api.github.com/repos/quickleft/quickleft_v2",
//   "forks_url": "https://api.github.com/repos/quickleft/quickleft_v2/forks",
//   "keys_url": "https://api.github.com/repos/quickleft/quickleft_v2/keys{/key_id}",
//   "collaborators_url": "https://api.github.com/repos/quickleft/quickleft_v2/collaborators{/collaborator}",
//   "teams_url": "https://api.github.com/repos/quickleft/quickleft_v2/teams",
//   "hooks_url": "https://api.github.com/repos/quickleft/quickleft_v2/hooks",
//   "issue_events_url": "https://api.github.com/repos/quickleft/quickleft_v2/issues/events{/number}",
//   "events_url": "https://api.github.com/repos/quickleft/quickleft_v2/events",
//   "assignees_url": "https://api.github.com/repos/quickleft/quickleft_v2/assignees{/user}",
//   "branches_url": "https://api.github.com/repos/quickleft/quickleft_v2/branches{/branch}",
//   "tags_url": "https://api.github.com/repos/quickleft/quickleft_v2/tags",
//   "blobs_url": "https://api.github.com/repos/quickleft/quickleft_v2/git/blobs{/sha}",
//   "git_tags_url": "https://api.github.com/repos/quickleft/quickleft_v2/git/tags{/sha}",
//   "git_refs_url": "https://api.github.com/repos/quickleft/quickleft_v2/git/refs{/sha}",
//   "trees_url": "https://api.github.com/repos/quickleft/quickleft_v2/git/trees{/sha}",
//   "statuses_url": "https://api.github.com/repos/quickleft/quickleft_v2/statuses/{sha}",
//   "languages_url": "https://api.github.com/repos/quickleft/quickleft_v2/languages",
//   "stargazers_url": "https://api.github.com/repos/quickleft/quickleft_v2/stargazers",
//   "contributors_url": "https://api.github.com/repos/quickleft/quickleft_v2/contributors",
//   "subscribers_url": "https://api.github.com/repos/quickleft/quickleft_v2/subscribers",
//   "subscription_url": "https://api.github.com/repos/quickleft/quickleft_v2/subscription",
//   "commits_url": "https://api.github.com/repos/quickleft/quickleft_v2/commits{/sha}",
//   "git_commits_url": "https://api.github.com/repos/quickleft/quickleft_v2/git/commits{/sha}",
//   "comments_url": "https://api.github.com/repos/quickleft/quickleft_v2/comments{/number}",
//   "issue_comment_url": "https://api.github.com/repos/quickleft/quickleft_v2/issues/comments{/number}",
//   "contents_url": "https://api.github.com/repos/quickleft/quickleft_v2/contents/{+path}",
//   "compare_url": "https://api.github.com/repos/quickleft/quickleft_v2/compare/{base}...{head}",
//   "merges_url": "https://api.github.com/repos/quickleft/quickleft_v2/merges",
//   "archive_url": "https://api.github.com/repos/quickleft/quickleft_v2/{archive_format}{/ref}",
//   "downloads_url": "https://api.github.com/repos/quickleft/quickleft_v2/downloads",
//   "issues_url": "https://api.github.com/repos/quickleft/quickleft_v2/issues{/number}",
//   "pulls_url": "https://api.github.com/repos/quickleft/quickleft_v2/pulls{/number}",
//   "milestones_url": "https://api.github.com/repos/quickleft/quickleft_v2/milestones{/number}",
//   "notifications_url": "https://api.github.com/repos/quickleft/quickleft_v2/notifications{?since,all,participating}",
//   "labels_url": "https://api.github.com/repos/quickleft/quickleft_v2/labels{/name}",
//   "releases_url": "https://api.github.com/repos/quickleft/quickleft_v2/releases{/id}",
//   "created_at": "2010-07-17T16:50:56Z",
//   "updated_at": "2014-01-11T00:06:16Z",
//   "pushed_at": "2012-01-23T17:22:27Z",
//   "git_url": "git://github.com/quickleft/quickleft_v2.git",
//   "ssh_url": "git@github.com:quickleft/quickleft_v2.git",
//   "clone_url": "https://github.com/quickleft/quickleft_v2.git",
//   "svn_url": "https://github.com/quickleft/quickleft_v2",
//   "homepage": "quickleft.com",
//   "size": 42504,
//   "stargazers_count": 0,
//   "watchers_count": 0,
//   "language": "Ruby",
//   "has_issues": true,
//   "has_downloads": true,
//   "has_wiki": true,
//   "has_pages": false,
//   "forks_count": 0,
//   "mirror_url": null,
//   "open_issues_count": 0,
//   "forks": 0,
//   "open_issues": 0,
//   "watchers": 0,
//   "default_branch": "master",
//   "master_branch": "master",
//   "permissions": {
//     "admin": false,
//     "push": true,
//     "pull": true
//   }
// }
