var _ = require('lodash');
var Hapi = require('hapi');
var server = new Hapi.Server();
var path = require('path');
var config = require('config');
var url = require('url');

server.connection({
  host: '0.0.0.0',
  port: process.env.PORT || 3700
});

server.views({
  engines: {
    html: require('swig')
  },
  path: path.join(__dirname, 'views'),
  isCached: process.env.NODE_ENV === 'production',
  compileOptions: {
    isPretty: true
  }
});

server.route([
  {
    method: 'GET',
    path: '/',
    handler: function (request, reply) {
      reply.view('home.html');
    }
  },
  {
      method: 'GET',
      path: '/{p*}',
      handler: {
        directory: {
          path: 'public'
        }
      }
    }
]);

server.start(function () {
    console.log('Server running at:', server.info.uri);
})
