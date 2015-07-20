exports.mayk_root = 'http://localhost:3700';
exports.cookie_password = process.env.COOKIE_PASSWORD || 'mayk-cookie';

// Github Keys
exports.github_client_id = '59a34174e793460b2509';
exports.github_client_secret = 'a30a79eef9e2550036e9a7120e1cdab1b9953a93';
exports.github_redirect_uri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3700/auth/github';
exports.env = process.env.NODE_ENV || 'development';
