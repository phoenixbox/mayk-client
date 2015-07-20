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
import {UserStore} from '../../stores/UserStore';
import {GitHubStore} from '../../stores/GitHubStore';
import GitHubActions from '../../actions/GitHubActions';
import UserActions from '../../actions/UserActions';

// Components
import {CommitGraph} from '../components/commit-graph';

let BASE_URL = process.env.NODE_ENV === 'production' ? 'https://deveval.io' : 'http://127.0.0.1:3000';

let internals = {
  getStateFromStores() {
    let user = UserStore.getCurrentUser();

    return {
      currentUser: user,
      repos: GitHubStore.userRepos(),
      orgs: GitHubStore.userOrgs(),
      commits: GitHubStore.userCommits(),
      individualCommits: GitHubStore.individualCommits(),
      isLoading: GitHubStore.isLoading(),
    }
  },

  findOrSetCurrentUser(user) {
    let storeUser = UserStore.getCurrentUser();
    // Setting the current user should go through the action creator
    let currentUser = _.isEmpty(storeUser) ? UserStore.setCurrentUser(user) : storeUser;

    return currentUser;
  }
}

let Home  = React.createClass({

  mixins: [Navigation],

  propTypes: {
    user: ReactPropTypes.object
  },

  getInitialState() {
    internals.findOrSetCurrentUser(this.props.user);

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
    // if (!_.isEmpty(this.state.repos)) debugger

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
    UserActions.signOut();
  },

  componentDidMount: function() {
    UserStore.addChangeListener(this._onChange);
    GitHubStore.addChangeListener(this._onChange);
    GitHubActions.init(this.state.currentUser);
  },

  componentWillUnmount: function() {
    UserStore.removeChangeListener(this._onChange);
    GitHubStore.removeChangeListener(this._onChange);
  },

  tableMetaData() {
    let totalCommitsCount =  _.reduce(this.state.commits, (result, val) => {
      result += val.stats.total;

      return result;
    }, 0);
  },

  setInRedis() {
    var commitControllerURL = `http://localhost:3000/users/${this.props.user.id}/commits`

    request.post(commitControllerURL)
      .set('Access-Control-Allow-Origin', '*')
      .send({
        token: this.props.user.token,
        data: [
        {
          "sha": _.random(0,100000),
          "commit": {
            "author": {
              "name": "Shane Rogers"
            },
            "url": "https://api.github.com/repos/phoenixbox/repo1/git/commits/001"
          }
        },
        {
          "sha": _.random(0,100000),
          "commit": {
            "author": {
              "name": "Shane Rogers"
            },
            "url": "https://api.github.com/repos/phoenixbox/repo1/git/commits/002"
          }
        }
      ]})
      .set('Accept', 'application/json')
      .end(function(err, res){
        if (res.ok) {
          console.log('setInRedis: ', JSON.stringify(res.body));
        } else {
          console.log('set: ', res.text);
        }
      });
  },

  fetchFromRedis() {
    var commitControllerURL = `http://localhost:3000/users/${this.props.user.id}/commits`

    request.get(commitControllerURL)
      .set('Access-Control-Allow-Origin', '*')
      .query({ token: this.props.user.token })
      .set('Accept', 'application/json')
      .end(function(err, res){
        if (res.ok) {
          console.log('fetchedDataFromRedis: ', res.body.data);
        } else {
          console.log('fetchFromRedis ERROR: ', res.text);
        }
      });
  },

  render() {
    // this.fetchFromRedis();
    // this.setInRedis();

    let loadingIndicator;
    // let table = this.buildReposTable();
    let table = <h1>Table</h1>;
    //
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
      <div className="col-sm-12">
        <div><a className="btn btn-primary" onClick={this.signOut}>Sign Out</a></div>
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

  /**
   * Event handler for 'change' events coming from the StoresStore
   */
  _onChange: function() {
    this.setState(internals.getStateFromStores());
  }

})

module.exports = Home;
