const { CookieJar, CookieAccessInfo } = require('cookiejar');
const debug = require('debug')('getlet');

module.exports = jarlet;

function jarlet(jar = new CookieJar()) {
  function store({ host, path }, res) {
    const cookies = res.headers['set-cookie'];
    if (cookies) {
      debug('Storing cookies: %j', cookies);
      jar.setCookies(cookies, host, path);
    }
  }

  function attach({ secure, host, path }, req) {
    debug('Secure: %o', secure);
    const cai = new CookieAccessInfo(host, path, secure);
    const cookies = jar.getCookies(cai).toValueString();
    debug('Attach cookies: %j', cookies);
    if (cookies) {
      req.setHeader('cookie', cookies);
    }
  }

  return {
    store,
    attach
  };
}
