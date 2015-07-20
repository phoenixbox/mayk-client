let _ = require('lodash');
import request from 'superagent-bluebird-promise';
import Promise from 'bluebird';
import async from 'async';
// TODO: load flux files
// import GitHubActions from '../actions/GitHubActions.js';

const GITHUB_BASE = 'https://api.github.com';
const USER = '/user';
const USER_ORGS = '/user/orgs';
const USER_REPOS =  '/user/repos';
const REPO_PAGE_LIMIT = 30;
const PER_PAGE_MAX = '&per_page=100';

var COMMITS = [];

var COMMIT_DATA = [];

var RESULTS = {};
var REQUESTS = [];

var STORE = {}

var targetRepoCount = 0;

var internals = {
  authRequest(token) {
    return 'access_token='+token;
  },

  getRepoPageCount: function(repoCount) {
    if (repoCount % REPO_PAGE_LIMIT == 0) {
      return repoCount/REPO_PAGE_LIMIT;
    } else {
      let definitePageCount =  Math.floor(repoCount/REPO_PAGE_LIMIT);
      return definitePageCount += 1;
    }
  },

  paginatedURI(uri, index) {
    return `${uri}&page=${index}`;
  },

  repoRequests(pageCount, token) {
    var uri = `${GITHUB_BASE}${USER_REPOS}?${internals.authRequest(token)}`;
    let repoRequests = [];

    for (var i = 1; i < pageCount+1; i++) {
      let paginatedURI = internals.paginatedURI(uri, i);
      let repoRequest = internals.getRequestWithUri(paginatedURI);

      repoRequests.push(repoRequest);
    }
    return repoRequests;
  },

  reduceResponses(responses) {
    return _.chain(responses)
              .map(function(arg) {
                return arg.body;
              })
              .flatten()
              .compact()
              .value();
  },

  getUserInfo(token) {
    var uri = `${GITHUB_BASE}${USER}?${internals.authRequest(token)}`;
    return internals.getRequestWithUri(uri);
  },

  orgsRequest(token) {
    var uri = `${GITHUB_BASE}${USER_ORGS}?${internals.authRequest(token)}`;

    return internals.getRequestWithUri(uri);
  },
  // TODO: Use the paging headers to know how many repos to get
  orgRepoRequests(orgs, token) {
    let allOrgRepoRequests = _.chain(orgs)
                                .map((org) => {
                                  var uri = `${org.repos_url}?${internals.authRequest(token)}`;
                                  // Can get 100 repos at a time?
                                  let pageCount = 5;
                                  let orgRepoRequests = [];

                                  for (var i = 1; i < pageCount+1; i++) {
                                    let paginatedURI = internals.paginatedURI(uri, i);
                                    let repoRequest = internals.getRequestWithUri(paginatedURI);

                                    orgRepoRequests.push(repoRequest);
                                  }

                                  return orgRepoRequests;
                                })
                                .flatten()
                                .value();

    return allOrgRepoRequests;
  },

  getRequestWithUri(uri, params) {
    return request.get(uri)
                  .send(params)
                  .set('Accept', 'application/vnd.github.v3+json')
                  .set('Accept', 'application/vnd.github.moondragon+json') // Orgs required accept header
  },
  // TODO: settle on the correct request interface
  getRequestWithQuery(uri, query) {
    return request.get(uri)
                  .query(query)
                  .set('Accept', 'application/vnd.github.v3+json')
                  .set('Accept', 'application/vnd.github.moondragon+json') // Orgs required accept header
  },
  /*
    URI: /repos/:owner/:repo/commits
    {sha} string default branch master
    {path} string
    {author} string
    {since} string ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
    {until} string ISO 8601 format: YYYY-MM-DDTHH:MM:SSZ
    https://developer.github.com/v3/repos/commits/#list-commits-on-a-repository
  */

  buildCommitURL(repo, user, pageNumber) {
    let commitURL = internals.stripURI_SHA(repo.commits_url);

    var username = internals.extractUsername(user);

    return `${commitURL}?${internals.authRequest(user.token)}${PER_PAGE_MAX}&author=${username}`;
  },

  /*
    Org url available on the user
    https://api.github.com/users/JumpstartLab/orgs
  */
  repoStatURLs(repos, user) {
    return _.map(repos, function(repo) {
      return `${GITHUB_BASE}/repos/${repo.owner.login}/${repo.name}/stats/contributors?${internals.authRequest(user.token)}`;
    })
  },

  // Commit activity
  // /repos/:owner/:repo/stats/commit_activity
  // Gives page 52 weeks over a year
  repoCommitActivityURLs(repos, user) {
    return _.map(repos, function(repo) {
      return `${GITHUB_BASE}/repos/${repo.owner.login}/${repo.name}/stats/commit_activity?${internals.authRequest(user.token)}`
    })
  },

  // https://api.github.com/repos/sprintly/partyline/commits?access_token=9ab793b04bdd6413ceb442813c81dc9293ccb9b5&author=phoenixbox
  // https://api.github.com/repos/sprintly/partyline/commits?access_token=9ab793b04bdd6413ceb442813c81dc9293ccb9b5&author=phoenixbox
  // Default to page 1
  // **** THIS IS ALLOWED!!! per_page=100
  authorCommitsURLs(repos, user) {
    var username = internals.extractUsername(user);

    return _.map(repos, function(repo) {
      return `${GITHUB_BASE}/repos/${repo.owner.login}/${repo.name}/commits?${internals.authRequest(user.token)}&author=${username}&per_page=100&page=1`
    })
  },

  repoCommitActivityRequests(repos, user) {
    var URLS = internals.repoCommitActivityURLs(repos, user);

    var commitActivityRequests = _.map(URLS, (url) => {
      return request.get(url)
              .set('Accept', 'application/vnd.github.v3+json')
              .set('Accept', 'application/vnd.github.moondragon+json')
              .then((resp) => {
                return resp.body;
              })
    })

    return [
      commitActivityRequests
    ]
  },

  // ***************************************

  stripThePerPageParam(url) {
    return url.replace(PER_PAGE_MAX, '');
  },

  updateUrlWithNext(url, next) {
    var sanitizedUrl = internals.stripThePerPageParam(url);
    sanitizedUrl = sanitizedUrl.replace(/page=(\d+)/, `page=${next}`);

    return `${sanitizedUrl}${PER_PAGE_MAX}`;
  },

  makeAnotherRequest(url, resp, store) {
    let link = resp.headers.link;

    if (link && internals.morePages(link)) {
      let nextPage = internals.nextPageNumber(link)
      let nextRequestUrl = internals.updateUrlWithNext(url, nextPage);

      internals.nextRequest(nextRequestUrl, store);
    } else {
      store.incrementCommitsForRepoCount();

      console.log(`commitsForRepoCount: ${store.commitsForRepoCount()} === targetRepoCount: ${targetRepoCount}`);

      // Allow a 5% error margin
      if (store.commitsForRepoCount() >= targetRepoCount*0.95) {
        // redisStore.good
        store.stopLoading();
      }

      let ownerRepo = url.split('repos')[1].split('commits')[0];
      let repoCount = store.userRepos().length;
      console.log(`USER REPO COUNT ${repoCount}`);
      console.log(`NO MORE COMMITS FOR: ${ownerRepo}`);

      store.emitChange();
    }
  },

  nextRequest(url, store) {
    return request.get(url)
            .set('Accept', 'application/vnd.github.v3+json')
            .set('Accept', 'application/vnd.github.moondragon+json')
            .then((resp) => {
              if (resp.status === 200) {
                // ADD TO REDIS
                internals.addToRedis(resp.body);

                store.addCommits(resp.body);
                internals.makeAnotherRequest(url, resp, store)
              } else {
                console.log('ERROR commit get: ', resp.status)
              }
            })
  },

  addToRedis(data) {
    // http://localhost:3000/
    console.log('ADD TO REDIS IN GITHUB SERVICE STUB');
    var commitControllerURL = '';
  },

  authorCommitsPerRepo(repos, user, store) {
    targetRepoCount = repos.length;

    var commitURLs = internals.authorCommitsURLs(repos, user);

    _.each(commitURLs, (url, i) => {
     request.get(url)
            .set('Accept', 'application/vnd.github.v3+json')
            .set('Accept', 'application/vnd.github.moondragon+json')
            .then((resp) => {
              /* IDEAL
                Go through the action creator
                Have a final request 'signal'
              */
              if (resp.status === 200) {
                store.addCommits(resp.body);
                internals.makeAnotherRequest(url, resp, store)
              } else {
                console.log('ERROR commit get: ', resp.status)
              }
            })
    })
  },

  // ***************************************

  repoCommitRequests(repos, user) {
    var URLS = internals.repoStatURLs(repos, user);

    var commitRequests = _.map(URLS, (url) => {
      return request.get(url)
              .set('Accept', 'application/vnd.github.v3+json')
              .set('Accept', 'application/vnd.github.moondragon+json')
              .then((resp) => {
                return resp.body;
              })
    })

    return [
      commitRequests
    ]
  },

  morePages(link){
    return link.match(/rel="next"/);
  },

  stripAndReturnRels(matches) {
    return _.map(matches, (match) => {
      return match.split('rel=')[1].replace(/"/g, '');
    })
  },

  nextPageNumber(link) {
    if (link) {
      var sanitizedLink = link.replace(PER_PAGE_MAX, '');
      var matches = sanitizedLink.match(/page=(\d+)/)

      if (matches && matches.length == 2) {
        return matches[1];
      } else {
        return 0;
      }
    } else {
      return 0;
    }
  },

  stripURI_SHA(uri) {
    return uri.replace(/{\/sha}/g, '')
  },

  extractUsername(user) {
    return user.github_url.split('https://github.com/')[1];
  },

  groupReposByOrg(repos) {
    /*
      ORG URL:      "organizations_url": "https://api.github.com/users/blairanderson/orgs"
      GROUPED URLS: { https://api.github.com/users/blairanderson/orgs: Array[1], ...}

      Group by organization_url then sanitize the url to its owner
      Use the owner as the new key name
    */
    var groupedRepos = _.groupBy(repos, "owner.organizations_url");

    var pureOrgKeys = _.chain(groupedRepos)
                        .keys(repos)
                        .map(function(key) {
                          var newKey;
                          newKey = key.replace(/https:\/\/api.github.com\/users/, '');
                          newKey = newKey.replace(/orgs/, '');
                          newKey = newKey.replace(/\//g, '');

                          return newKey
                        })
                        .value();

    return _.zipObject(pureOrgKeys, _.values(groupedRepos));
  }
}

module.exports.GitHubService = {
  fetchUserOrgs(token) {
    return Promise.all([
      internals.orgsRequest(token)
    ])
    .spread(function(response) {
      return response.body;
    })
  },

  fetchUserRepos(token) {
    return Promise.all([
      internals.getUserInfo(token)
    ])
    .spread(function(userInfo) {
      return internals.getRepoPageCount(userInfo.body.public_repos);
    })
    .then(function(pageCount) {
      return internals.repoRequests(pageCount, token);
    })
    .all()
    .spread(function() {
      return internals.reduceResponses(arguments);
    })
  },

  fetchOrgRepos(orgs, token) {
    let orgRepoRequests = internals.orgRepoRequests(orgs, token);

    return Promise.all(orgRepoRequests)
      .spread(function() {
        return internals.reduceResponses(arguments);
      })
  },

  // **** Fetch options ****

  // #1: Commit Activity Data Across weeks
  fetchAuthorCommits(repos, user) {
    // Week Data
    let repoCommitRequests = internals.repoCommitRequests(repos, user);

    return Promise.all(repoCommitRequests)
      .spread(function() {
        return arguments[0];
      })
  },

  // #2: Commit Activity Data but for days but all authors
  fetchCommitActivity(repos, user) {
    let repoCommitRequests = internals.repoCommitActivityRequests(repos, user);

    return Promise.all(repoCommitRequests)
      .spread(function() {
        return arguments[0];
      })
  },

  // #3: Each commit for a user per repo
  fetchCommitsForAllRepos(repos, user, store) {
    internals.authorCommitsPerRepo(repos, user, store);
  }
}

module.exports.internals = internals;
