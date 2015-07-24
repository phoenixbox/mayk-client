import React from "react";
import _ from 'lodash';
import { RouteHandler } from "react-router";
import SessionStore from '../stores/SessionStore.js';
import SessionActions from '../actions/SessionActions.js';

function getStateFromStores() {
  // Should have the requisite github profile info
  return {
    user: SessionStore.getCurrentUser(),
    github: SessionStore.getGithub()
  }
}

export default React.createClass({
  getInitialState() {
    return getStateFromStores();
  },

  componentDidMount() {
    SessionStore.addChangeListener(this._onChange)
    SessionActions.init();
  },

  componentWillUnmount() {
    SessionStore.removeChangeListener(this._onChange)
  },

  render: function() {
    // TODO: Replace the whole body and insert the bootstrap header here with sidebars
    var passingProps = _.assign(_.cloneDeep(this.props), this.state)
    console.log('GITHUB: ', this.state.github);
    return (
      <RouteHandler github={this.state.github} />
    )
  },

  _onChange() {
    this.setState(getStateFromStores());
  }
});
