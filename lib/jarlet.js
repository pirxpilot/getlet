import { CookieAccessInfo, CookieJar } from 'cookiejar';
import Debug from 'debug';

const debug = Debug('getlet');

export default function jarlet(jar = new CookieJar()) {
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
