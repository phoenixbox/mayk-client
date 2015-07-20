module.exports = {
  rootURL: function(env) {
    var root;

    switch (env) {
      case 'production':
        root = 'https://mayk.io';
        break;
      case 'staging':
        root = 'https://mayk-staging.herokuapp.com';
        break;
      case 'development':
        root = 'http://127.0.0.1:3000';
        break;
      case 'test':
        root = 'http://127.0.0.1:3000';
        break;
      default:
        throw new Error('No valid ENV var provided for rootURL');
    }

    return root;
  }
}
