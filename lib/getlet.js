const http = require('http');
const https = require('https');
const { PassThrough } = require('stream');
const { createGunzip, createInflate, createBrotliDecompress } = require('zlib');
const debug = require('debug')('getlet');

const jarlet = require('./jarlet');

/* global URL */

module.exports = getlet;

const BROTLI = typeof createBrotliDecompress === 'function';
const ACCEPT_ENCODING = BROTLI ? 'br, gzip, deflate' : 'gzip, deflate';

Object.assign(getlet, {
  BROTLI,
  ACCEPT_ENCODING
});

function getInflatorStream({ headers }) {
  switch (headers['content-encoding']) {
    case 'gzip':
    case 'x-gzip':
      return createGunzip();
    case 'deflate':
      return createInflate();
    case 'br':
      return BROTLI && createBrotliDecompress();
  }
}

function getlet(u, autoInit = true) {
  const self = Object.assign(new PassThrough(), {
    abort,
    auth,
    cookies,
    header,
    host,
    inflate: setInflate,
    method,
    path,
    secure,
    send,
    set: header,
    url,
    userAgent,
    init
  });

  let options = {
    headers: { 'Accept-Encoding': ACCEPT_ENCODING },
    maxRedirects: 0
  };
  let redirects = Object.create(null);
  let transport = http;
  let data;
  let aborted;
  let currentRequest;
  let cookieJar;
  let inflate = true; // inflate by default

  function host(h) {
    options.host = h;
    return self;
  }

  function method(m) {
    options.method = m;
    return self;
  }

  function path(p) {
    options.path = p;
    return self;
  }

  function secure(flag) {
    options.secure = flag;
    transport = flag ? https : http;
    return self;
  }

  function setInflate(_inflate) {
    inflate = _inflate;
    return self;
  }

  function header(name, value) {
    if (value !== undefined) {
      options.headers[name] = value;
    }
    else {
      Object.entries(name).forEach(([n, v]) => options.headers[n] = v);
    }
    return self;
  }

  function send(d) {
    data = d;
    return self;
  }

  function userAgent(ua) {
    return header('User-Agent', ua);
  }

  function auth(username, password) {
    options.auth = typeof password === 'string'
      ? `${username}:${password}`
      : username;
    return self;
  }

  function isRedirect(res) {
    return Math.floor(res.statusCode / 100) === 3;
  }

  function isError(res) {
    return Math.floor(res.statusCode / 100) !== 2;
  }

  function cookies(jar) {
    // in case redirect is to the same location but expects cookies
    options.maxRedirects = 1;
    cookieJar = jarlet(jar);
    return self;
  }

  function url(u, base) {
    let parsed = new URL(u, base);
    secure(parsed.protocol === 'https:');
    host(parsed.host);
    path(parsed.pathname + parsed.search);
    if (parsed.username || parsed.password) {
      auth(parsed.username, parsed.password);
    }
  }

  function propagateError(err) {
    debug('Error detected: %s', err);
    self.emit('error', err);
    self.end();
  }

  function isLoop() {
    let location = [options.protocol, options.host, options.path];
    if (redirects[location] > options.maxRedirects) {
      return true;
    }
    redirects[location] = (redirects[location] || 0) + 1;
  }

  function handleRedirect(res) {
    let { location } = res.headers;
    debug('Redirecting to %s', location);
    url(location, `${options.secure ? 'https' : 'http'}://${options.host}${options.path}`);
    if (isLoop()) {
      return propagateError('Redirect loop detected: ' + location);
    }
    init();
  }

  function abort() {
    if (aborted) {
      return self;
    }
    aborted = true;
    if (currentRequest) {
      currentRequest.abort();
    }
    return self;
  }

  function init() {
    if (aborted) {
      self.end();
      return self;
    }
    let req = transport.request(Object.assign({}, options));
    currentRequest = req;
    if (cookieJar) {
      cookieJar.attach(options, req);
    }
    if (data) {
      req.write(data);
    }
    isLoop(options);
    req.on('response', function(res) {
      if (cookieJar) {
        cookieJar.store(options, res);
      }
      if (isRedirect(res)) {
        return handleRedirect(res);
      }
      if (isError(res)) {
        return propagateError('HTTP Error: ' + res.statusCode);
      }
      self.emit('response', res);
      if (inflate) {
        const inflator = getInflatorStream(res);
        if (inflator) {
          debug('Decompress response');
          inflator.on('error', propagateError);
          res = res.pipe(inflator);
        }
      }
      res.pipe(self);
    });
    req.on('error', propagateError);
    debug('GET %s on %s', options.path, options.host);
    req.end();
    return self;
  }

  if (u === false) {
    // Boolean false means autoinit not URL
    autoInit = false;
  } else if (u) {
    url(u);
  }

  if (autoInit) {
    process.nextTick(init);
  }

  return self;
}
