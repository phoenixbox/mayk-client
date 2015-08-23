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

let Preview = React.createClass({

  propTypes: {
    user: React.PropTypes.object,
    github: React.PropTypes.object
  },

  mixins: [Navigation],

  getInitialState() {
    // TODO: Loading state should come from the github store down
    return {
      isLoading: false
    }
  },

  githubUserMetaDetails() {
    let whitelistedAttrs = ['github_username', 'github_email', 'github_display_name'];

    let userDetailsList = _.reduce(this.props.github, function(memo, val, key) {
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
    let requiredAttrs = this.props.github;
    this.setState({
      isLoading: true
    })

    GitHubActions.publishPortfolio(this.props.github);
  },

  render() {
    let userDetails = this.githubUserMetaDetails();
    let publishClasses = React.addons.classSet({
      "btn": true,
      "btn-default": !this.state.isLoading,
      "btn-warning": this.state.isLoading
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
  }
})

module.exports = Preview;
