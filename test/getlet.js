const test = require('tape');
const nock = require('nock');
const concat = require('concat-stream');
const { Transform } = require('stream');

const getlet = require('..');

test('should request simple data', function (t) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data').pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'abc');
    t.end();
  }));
});

test('should work without autoinit with url', function (t) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  const request = getlet('http://example.com/simple/data', false);

  setTimeout(() => {
    request.pipe(concat({
      encoding: 'string'
    }, function(data) {
      t.equal(data, 'abc');
      t.end();
    }));
    request.init();
  }, 100);
});

test('should work without autoinit without url', function (t) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  const request = getlet(false)
    .host('example.com')
    .path('/simple/data');

  setTimeout(() => {
    request.pipe(concat({
      encoding: 'string'
    }, function(data) {
      t.equal(data, 'abc');
      t.end();
    }));
    request.init();
  }, 100);
});

test('should emit response event', function (t) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data')
    .on('response', function(res) {
      t.equal(res.statusCode, 200);
      t.end();
    })
    .pipe(concat());
});

test('should post data', function (t) {
  nock('http://example.com')
    .post('/simple/data', '123')
    .reply(200, 'cde');

  getlet('http://example.com/simple/data')
    .method('POST')
    .send('123')
    .pipe(concat({ encoding: 'string' }, function(data) {
      t.equal(data, 'cde');
      t.end();
    }));
});

test('should support host and path simple data', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(200, 'abc');

  getlet().host('example.com').path('/simple/data').pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'abc');
    t.end();
  }));
});

test('should support HTTPs', function (t) {
  nock('https://example.com')
    .get('/simple/data')
    .reply(200, 'abc');

  getlet()
    .secure(true)
    .host('example.com')
    .path('/simple/data')
    .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'abc');
    t.end();
  }));
});

test('should support custom headers', function (t) {
  nock('http://example.com')
    .matchHeader('authorization', '1234')
    .matchHeader('user-agent', 'Getlet Test')
    .get('/simple/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data')
  .header('Authorization', '1234')
  .userAgent('Getlet Test')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'abc');
    t.end();
  }));
});

test('should support multiple headers', function (t) {
  nock('http://example.com')
    .matchHeader('authorization', '1234')
    .matchHeader('x-custom', 'custom value')
    .get('/simple/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data')
  .set({
    authorization: '1234',
    'x-custom': 'custom value'
  })
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'abc');
    t.end();
  }));
});

test('should follow redirects', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(301, '', {
      location: '/more/data'
    })
    .get('/more/data')
    .reply(302, '', {
      location: 'https://another.com/data'
    });
  nock('https://another.com')
    .get('/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'abc');
    t.end();
  }));
});

test('should handle cookies', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(301, '', {
      location: '/more/data',
      'set-cookie': 'token=xyz; HttpOnly; Path=/'
    });
  nock('http://example.com', {
      reqHeaders: { 'cookie': 'token=xyz' }
    })
    .get('/more/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data')
    .cookies()
    .pipe(concat({
      encoding: 'string'
    }, function(data) {
      t.equal(data, 'abc');
      t.end();
    }));
});

test('should detect redirect loops', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(301, '', {
      location: '/more/data'
    })
    .get('/more/data')
    .twice()
    .reply(302, '', {
      location: '/more/data'
    });

  getlet('http://example.com/simple/data')
  .on('error', function(err) {
    t.equal(err, 'Redirect loop detected: /more/data');
    t.end();
  })
  .pipe(concat());
});

test('should propagate errors', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(404, 'No such file');

  getlet('http://example.com/simple/data')
  .on('error', function(err) {
    t.equal(err, 'HTTP Error: 404');
    t.end();
  })
  .pipe(concat());
});

test('should unzip responses', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .replyWithFile(200, __dirname + '/fixtures/response.txt.gz', {
      'content-encoding': 'gzip'
    });

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'This is compressed response!');
    t.end();
  }));
});

test('should inflate responses', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .replyWithFile(200, __dirname + '/fixtures/response.txt.flate', {
      'content-encoding': 'deflate'
    });

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'This is compressed response!');
    t.end();
  }));
});

test('should decompress brotli responses', { skip: !getlet.BROTLI }, function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .replyWithFile(200, __dirname + '/fixtures/response.txt.br', {
      'content-encoding': 'br'
    });

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    t.equal(data, 'This is compressed response!');
    t.end();
  }));
});

test('should ignore empty reponses with gzip encoding', function (t) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(200, '', {
      'content-encoding': 'gzip'
    });

  getlet('http://example.com/simple/data')
  .on('error', function(err) {
    t.ok(err, 'should emit an error');
    t.end();
  })
  .pipe(concat());
});

test('abort', function(t) {

  t.test('should close stream', function (t) {
    nock('http://example.com')
      .get('/simple/data')
      .reply(200, 'abcabcabcabc');

    let g = getlet('http://example.com/simple/data');

    let truncate = new Transform({
      transform(chunk, encoding, next) {
        // push 3 characters only and then abort
        this.push(chunk.slice(0, 3));
        next();
        g.abort();
      }
    });

    g
    .on('error', function(e) {
      t.ok(e, 'should see abort error');
      t.equal(e.code, 'ECONNRESET');
    })
    .pipe(truncate)
    .pipe(concat({ encoding: 'string'}, function(data) {
      t.equal(data, 'abc');
      t.end();
    }));
  });

  t.test('should not stream if already aborted', function (t) {
    nock('http://example.com')
      .get('/simple/data')
      .reply(200, 'abcabcabcabc');

    let g = getlet('http://example.com/simple/data');
    g.abort();

    g
    .pipe(concat({ encoding: 'string'}, function(data) {
      t.equal(data, '');
      t.end();
    }));
  });


});

