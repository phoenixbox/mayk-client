import React from "react";
import { RouteHandler } from "react-router";
import SessionStore from '../stores/SessionStore.js';
import SessionActions from '../actions/SessionActions.js';

function getStateFromStores() {
  // Should have the requisite github profile info
  return {
    isLoggedIn: SessionStore.isLoggedIn,
    email: SessionStore.getEmail()
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
    return (
      <RouteHandler {...this.props} />
    )
  },

  _onChange() {
    this.setState(getStateFromStores());
  }
});
