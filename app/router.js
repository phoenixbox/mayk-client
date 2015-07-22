import React from 'react'
import Router, { Route, DefaultRoute } from 'react-router';
import App from './views/app';
import Profile from './views/pages/profile';

var routes = (
  <Route name="app" path="/" handler={App}>
    <DefaultRoute handler={Profile} />
    <Route name="profile" path="profile" handler={Profile} />
  </Route>
);

export default function() {
  Router.run(routes, Router.HistoryLocation, function(Handler, state) {
    React.render(<Handler />, document.getElementById('mayk__app'));
  });
}
