'use strict';

// Native
import React from 'react/addons';
let ReactPropTypes = React.PropTypes;
import Router, {Link, Navigation} from 'react-router';
import GithubStore from '../../stores/GitHubStore';
import SessionStore from '../../stores/SessionStore';
import GitHubActions from '../../actions/GitHubActions';

// Libs
import _ from 'lodash';
import Isvg from 'react-inlinesvg';

let internals = {
  getStateFromStores() {
    return {
      github: SessionStore.getGithub(),
      repos: GithubStore.userRepos(),
      orgs: GithubStore.userOrgs(),
      commits: GithubStore.userCommits(),
      individualCommits: GithubStore.individualCommits(),
      isLoading: GithubStore.isLoading(),
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

  componentDidMount() {
    GithubStore.addChangeListener(this._onChange)
  },

  componentWillUnmount() {
    GithubStore.removeChangeListener(this._onChange)
  },

  publishPortfolio() {
    // SHIM: there will be a portfolio store which will represent all the data required for page generation
    let requiredAttrs = this.state.github;

    GitHubActions.publishPortfolio(requiredAttrs);
  },

  render() {
    let userDetails = this.githubUserMetaDetails();
    let publishClasses = React.addons.classSet({
      "btn": true,
      "btn btn-default": !this.state.isLoading,
      "btn btn-warning": this.state.isLoading
    })

    return (
      <div className="preview col-sm-12">
        <div><a className={publishClasses} onClick={this.publishPortfolio}>Publish</a></div>
        <div className="preview__avatar">
          <div className="octagon-mask">
            <Isvg src="/img/svg/mayk_octagon.svg">
            </Isvg>
          </div>
          {userDetails}
        </div>
      </div>
    )
  },

  _onChange() {

  }
})

module.exports = Preview;
