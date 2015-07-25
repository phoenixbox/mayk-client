import React from "react";
import _ from 'lodash';
import { RouteHandler } from "react-router";
import SessionStore from '../stores/SessionStore.js';
import SessionActions from '../actions/SessionActions.js';

export default React.createClass({
  render: function() {
    // TODO: Replace the whole body and insert the bootstrap header here with sidebars
    return (
      <RouteHandler {...this.props} />
    )
  }
});
