import React from "react";
import { RouteHandler } from "react-router";
import SessionStore from '../stores/SessionStore.js';

function getStateFromStores() {
  // Gravatar information?
  // Name information
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
  },

  componentWillUnmount() {
    SessionStore.removeChangeListener(this._onChange)
  },

  _onChange() {
    this.setState(getStateFromStores());
  },

  render: function() {
    // TODO: Replace the whole body and insert the bootstrap header here with sidebars
    return (
      <RouteHandler {...this.props} />
    )
  }
});
