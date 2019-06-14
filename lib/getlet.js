const http = require('http');
const https = require('https');
const { PassThrough } = require('stream');
const { parse } = require('url');
const { createGunzip, createInflate, createBrotliDecompress } = require('zlib');
const debug = require('debug')('getlet');

const jarlet = require('./jarlet');

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

function getlet(u) {
  const self = Object.assign(new PassThrough(), {
    abort,
    auth,
    cookies,
    header,
    host,
    method,
    path,
    secure,
    send,
    set: header,
    url,
    userAgent
  });

  let options = {
    headers: { 'Accept-Encoding': ACCEPT_ENCODING }
  };
  let redirects = Object.create(null);
  let transport = http;
  let data;
  let aborted;
  let currentRequest;
  let cookieJar;

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
    cookieJar = jarlet(jar);
    return self;
  }

  function url(u) {
    let parsed = parse(u, false, true);
    if (parsed.host) {
      host(parsed.host);
    }
    if (parsed.path) {
      path(parsed.path);
    }
    if (parsed.protocol) {
      secure(parsed.protocol === 'https:');
    }
    if (parsed.auth) {
      auth(parsed.auth);
    }
  }

  function propagateError(err) {
    debug('Error detected: %s', err);
    self.emit('error', err);
    self.end();
  }

  function isLoop() {
    let location = [options.protocol, options.host, options.path];
    if (redirects[location]) {
      return true;
    }
    redirects[location] = true;
  }

  function handleRedirect(res) {
    let location = res.headers.location;
    debug('Redirecting to %s', location);
    url(location);
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
      const inflator = getInflatorStream(res);
      if (inflator) {
        debug('Decompress response');
        inflator.on('error', propagateError);
        res = res.pipe(inflator);
      }
      res.pipe(self);
    });
    req.on('error', propagateError);
    debug('GET %s on %s', options.path, options.host);
    req.end();
  }

  if (u) {
    url(u);
  }

  process.nextTick(init);

  return self;
}
