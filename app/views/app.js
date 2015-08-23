import React from "react";
import _ from 'lodash';
import { RouteHandler } from "react-router";
import SessionStore from '../stores/SessionStore.js';
import SessionActions from '../actions/SessionActions.js';

let internals = {
  getSessionFromStore() {
    let user = SessionStore.getUser();
    if (_.isEmpty(user)) {
      console.log('Session Init');
      SessionActions.init();
    }

    return {
      user: user,
      github: SessionStore.getGithub()
    }
  }
}

let App = React.createClass({

  getInitialState() {
    return internals.getSessionFromStore();
  },

  componentDidMount: function() {
    SessionStore.addChangeListener(this._onChange);
  },

  componentWillUnmount: function() {
    SessionStore.removeChangeListener(this._onChange);
  },

  render: function() {
    let componentProps = _.cloneDeep(this.props);

    if (!_.isEmpty(this.state.user)) {
      _.assign(componentProps, this.state);
    }

    return (
      <RouteHandler {...componentProps} />
    )
  },

  /*
    Event handler for 'change' events coming from the StoresStore
  */
  _onChange: function() {
    console.log('Session store updated')
    this.setState(internals.getSessionFromStore());
  }
});

export default App;
