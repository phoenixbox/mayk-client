'use strict';

// Native
import React from 'react/addons';
let ReactPropTypes = React.PropTypes;
import Router, {Link, Navigation} from 'react-router';

// Libs
import _ from 'lodash';
import {LineChart} from 'react-d3';
import {Table} from 'react-bootstrap';
import request from 'superagent-bluebird-promise';

// Stores
import GitHubStore from '../../stores/GitHubStore';
import SessionStore from '../../stores/SessionStore';
import SessionActions from '../../actions/SessionActions';
import GitHubActions from '../../actions/GitHubActions';
import UserActions from '../../actions/UserActions';

// Components
import {CommitGraph} from '../components/commit-graph';

let BASE_URL = process.env.NODE_ENV === 'production' ? 'https://deveval.io' : 'http://127.0.0.1:3000';

let internals = {
  getStateFromStores() {
    return {
      user: SessionStore.getUser(),
      github: SessionStore.getGithub(),
      repos: GitHubStore.userRepos(),
      orgs: GitHubStore.userOrgs(),
      commits: GitHubStore.userCommits(),
      individualCommits: GitHubStore.individualCommits(),
      isLoading: GitHubStore.isLoading(),
    }
  }
}

let Profile  = React.createClass({

  mixins: [Navigation],

  getInitialState() {
    return internals.getStateFromStores();
  },

  barChart() {
    var lineData = [
      {
        name: "series1",
        values: [ { x: 0, y: 20 }, { x: 24, y: 10 } ]
      },
      {
        name: "series2",
        values: [ { x: 70, y: 82 }, { x: 76, y: 82 } ]
      }
    ];

    return (
      <LineChart  legend={true}
                  data={lineData}
                  width={500}
                  height={300}
                  title="Line Chart"/>
      )
  },

  buildReposTable() {
    var repoRows = _.map(this.state.repos, (repo, index) => {
      let language = repo.language ? repo.language : 'Unknown';

      return (
        <tr key={index}>
          <td>{repo.id}</td>
          <td>{repo.name}</td>
          <td>{language}</td>
        </tr>
      )
    })

    return (
      <div class="profile__repo-table-container" style={{height: '500px', 'overflow': 'scroll'}}>
        <Table responsive>
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Language</th>
            </tr>
          </thead>
          <tbody>
            {repoRows}
          </tbody>
        </Table>
      </div>
    )
  },

  signOut() {
    SessionActions.logout();
  },

  componentDidMount: function() {
    SessionStore.addChangeListener(this._onChange);
    GitHubStore.addChangeListener(this._onChange);

    /*
      Session control point should be at the top of
      And passed as props
    */

    if (_.isEmpty(SessionStore.getUser())) {
      console.log('Session Init');
      SessionActions.init();
    }
  },

  componentWillUnmount: function() {
    SessionStore.removeChangeListener(this._onChange);
    GitHubStore.removeChangeListener(this._onChange);
  },

  tableMetaData() {
    let totalCommitsCount =  _.reduce(this.state.commits, (result, val) => {
      result += val.stats.total;

      return result;
    }, 0);

    return totalCommitsCount;
  },


  // Trigger action which interfaces to this
  // setInRedis() {
  //   var commitControllerURL = `http://localhost:3000/users/${this.props.user.id}/commits`
  //
  //   request.post(commitControllerURL)
  //     .set('Access-Control-Allow-Origin', '*')
  //     .send({
  //       token: this.props.user.token,
  //       data: [
  //       {
  //         "sha": _.random(0,100000),
  //         "commit": {
  //           "author": {
  //             "name": "Shane Rogers"
  //           },
  //           "url": "https://api.github.com/repos/phoenixbox/repo1/git/commits/001"
  //         }
  //       },
  //       {
  //         "sha": _.random(0,100000),
  //         "commit": {
  //           "author": {
  //             "name": "Shane Rogers"
  //           },
  //           "url": "https://api.github.com/repos/phoenixbox/repo1/git/commits/002"
  //         }
  //       }
  //     ]})
  //     .set('Accept', 'application/json')
  //     .end(function(err, res){
  //       if (res.ok) {
  //         console.log('setInRedis: ', JSON.stringify(res.body));
  //       } else {
  //         console.log('set: ', res.text);
  //       }
  //     });
  // },
  //
  // fetchFromRedis() {
  //   var commitControllerURL = `http://localhost:3000/users/${this.props.user.id}/commits`
  //
  //   request.get(commitControllerURL)
  //     .set('Access-Control-Allow-Origin', '*')
  //     .query({ token: this.props.user.token })
  //     .set('Accept', 'application/json')
  //     .end(function(err, res){
  //       if (res.ok) {
  //         console.log('fetchedDataFromRedis: ', res.body.data);
  //       } else {
  //         console.log('fetchFromRedis ERROR: ', res.text);
  //       }
  //     });
  // },
// GitHubActions.init(github);

  preview() {
    this.transitionTo('preview');
  },

  render() {
    /*
      Redis stuff
      this.fetchFromRedis();
      this.setInRedis();
    */
    console.log('GITHUB DETAILS: ', this.state.github);
    console.log('props: ', this.props);

    let loadingIndicator;
    let table = this.buildReposTable();
    let commitTotal = `Total Commits: ${this.tableMetaData()}`;

    let commitGraph;
    if (!_.isEmpty(this.state.individualCommits)) {
      console.log('COMMIT COUNT: ', this.state.individualCommits.length);
      commitGraph = <CommitGraph data={this.state.individualCommits}
                                isLoading={this.state.isLoading} />
    }

    if (this.state.isLoading) {
      loadingIndicator = <h3>Loading!</h3>;
    }

    return (
      <div className="profile col-sm-12">
        <h3>{commitTotal}</h3>
        <div><a className="btn btn-primary" onClick={this.signOut}>Sign Out</a></div>
        <div><a className="btn btn-default" onClick={this.preview}>Preview</a></div>
        <div ref='calendar' id="cal-heatmap">
          <div id='replaceable-container'>
            {commitGraph}
          </div>
        </div>
        {loadingIndicator}
        {table}
      </div>
    );
  },

  /*
    Event handler for 'change' events coming from the StoresStore
  */
  _onChange: function() {
    this.setState(internals.getStateFromStores());
  }
})

module.exports = Profile;
