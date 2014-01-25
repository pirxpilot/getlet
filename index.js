var http = require('http');
var https = require('https');
var parse = require('url').parse;
var zlib = require('zlib');
var debug = require('debug')('getlet');

module.exports = getlet;

function getlet(u) {
  var self,
    options = {
      headers: {
        'Accept-Encoding': 'gzip, deflate',
      }
    },
    redirects = Object.create(null),
    transport = http;

  function host(h) {
    options.host = h;
    return self;
  }

  function path(p) {
    options.path = p;
    return self;
  }

  function secure(flag) {
    transport = flag ? https : http;
    return self;
  }

  function header(name, value) {
    options.headers[name] = value;
    return header;
  }

  function userAgent(ua) {
    return header('User-Agent', ua);
  }

  function auth(username, password) {
    options.auth = [username, password].join(':');
    return self;
  }

  function isRedirect(res) {
    return Math.floor(res.statusCode / 100) === 3;
  }

  function isError(res) {
    return Math.floor(res.statusCode / 100) !== 2;
  }

  function isCompressed(res) {
    return (/^(deflate|gzip)$/).test(res.headers['content-encoding']);
  }

  function url(u) {
    var parsed = parse(u, false, true);
    if (parsed.host) {
      host(parsed.host);
    }
    if (parsed.path) {
      path(parsed.path);
    }
    if (parsed.protocol) {
      secure(parsed.protocol === 'https:');
    }
  }

  function propagateError(err, stream) {
    debug('Error detected: %s', err);
    stream.emit('error', err);
    stream.end();
  }

  function handleRedirect(res, stream) {
    var location = res.headers.location;
    if (redirects[location]) {
      return propagateError('Redirect loop detected: ' + location, stream);
    }
    debug('Redirecting to %s', location);
    url(location);
    pipe(stream);
  }

  function pipe(stream) {
    var req = transport.request(options);
    req.on('response', function(res) {
      if (isRedirect(res)) {
        return handleRedirect(res, stream);
      }
      if (isError(res)) {
        return propagateError('HTTP Error:' + res.statusCode, stream);
      }
      if (isCompressed(res)) {
        debug('Decompress response');
        res = res.pipe(zlib.createGunzip());
      }
      res.pipe(stream);
    });
    req.on('error', function(err) {
      propagateError(err, stream);
    });
    debug('GET %s on %s', options.path, options.host);
    req.end();
    return stream;
  }

  if (u) {
    url(u);
  }

  self = {
    host: host,
    path: path,
    secure: secure,
    pipe: pipe,
    url: url,
    header: header,
    auth: auth,
    userAgent: userAgent
  };

  return self;
}
