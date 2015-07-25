'use strict';

// Native
import React from 'react/addons';
let ReactPropTypes = React.PropTypes;
import Router, {Link, Navigation} from 'react-router';
import {GitHubStore} from '../../stores/GitHubStore';
import SessionStore from '../../stores/SessionStore';
import GitHubActions from '../../actions/GitHubActions';

// Libs
import _ from 'lodash';
import Isvg from 'react-inlinesvg';

let internals = {
  getStateFromStores() {
    return {
      github: SessionStore.getGithub(),
      repos: GitHubStore.userRepos(),
      orgs: GitHubStore.userOrgs(),
      commits: GitHubStore.userCommits(),
      individualCommits: GitHubStore.individualCommits(),
      isLoading: GitHubStore.isLoading(),
    }
  }
}

let Preview = React.createClass({
  mixins: [Navigation],

  getInitialState() {
    return internals.getStateFromStores();
  },

  propTypes: {
    user: ReactPropTypes.object,
    github: ReactPropTypes.object
  },

  githubUserMetaDetails() {
    let whitelistedAttrs = ['github_username', 'github_email', 'github_display_name'];

    let userDetailsList = _.reduce(this.state.github, function(memo, val, key) {
      if (_.contains(whitelistedAttrs, key)) {
        memo.push(<li key={key} className={`meta-li ${key}`}>{val}</li>)
      }

      return memo;
    }, []);

   return (
     <ul className="github__meta-list">
       {userDetailsList}
     </ul>
    )
  },

  publishPortfolio() {
    // SHIM: there will be a portfolio store which will represent all the data required for page generation
    let requiredAttrs = this.state.github;

    GitHubActions.publishPortfolio(requiredAttrs);
  },

  render() {
    let userDetails = this.githubUserMetaDetails();

    return (
      <div className="preview col-sm-12">
        <div><a className="btn btn-default" onClick={this.publishPortfolio}>Publish</a></div>
        <div className="preview__avatar">
          <div className="octagon-mask">
            <Isvg src="/img/svg/mayk_octagon.svg">
            </Isvg>
          </div>
          {userDetails}
        </div>
      </div>
    )
  }
})

module.exports = Preview;
