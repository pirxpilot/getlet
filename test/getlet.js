const test = require('node:test');
const assert = require('node:assert');
const nock = require('nock');
const concat = require('concat-stream');
const { Transform } = require('stream');

const getlet = require('..');

test('should request simple data', function (t, done) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data').pipe(concat({
    encoding: 'string'
  }, function(data) {
    assert.equal(data, 'abc');
    done();
  }));
});

test('should work without autoinit with url', function (t, done) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  const request = getlet('http://example.com/simple/data', false);

  setTimeout(() => {
    request.pipe(concat({
      encoding: 'string'
    }, function(data) {
      assert.equal(data, 'abc');
      done();
    }));
    request.init();
  }, 100);
});

test('should work without autoinit without url', function (t, done) {
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
      assert.equal(data, 'abc');
      done();
    }));
    request.init();
  }, 100);
});

test('should emit response event', function (t, done) {
  nock('http://example.com')
    .matchHeader('accept-encoding', getlet.ACCEPT_ENCODING)
    .get('/simple/data')
    .reply(200, 'abc');

  getlet('http://example.com/simple/data')
    .on('response', function(res) {
      assert.equal(res.statusCode, 200);
      done();
    })
    .pipe(concat());
});

test('should post data', function (t, done) {
  nock('http://example.com')
    .post('/simple/data', '123')
    .reply(200, 'cde');

  getlet('http://example.com/simple/data')
    .method('POST')
    .send('123')
    .pipe(concat({ encoding: 'string' }, function(data) {
      assert.equal(data, 'cde');
      done();
    }));
});

test('should support host and path simple data', function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(200, 'abc');

  getlet().host('example.com').path('/simple/data').pipe(concat({
    encoding: 'string'
  }, function(data) {
    assert.equal(data, 'abc');
    done();
  }));
});

test('should support HTTPs', function (t, done) {
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
    assert.equal(data, 'abc');
    done();
  }));
});

test('should support custom headers', function (t, done) {
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
    assert.equal(data, 'abc');
    done();
  }));
});

test('should support multiple headers', function (t, done) {
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
    assert.equal(data, 'abc');
    done();
  }));
});

test('should follow redirects', function (t, done) {
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
    assert.equal(data, 'abc');
    done();
  }));
});

test('should not follow redirects when switched off', function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(301, '', {
      location: '/more/data'
    });

    getlet('http://example.com/simple/data')
    .followRedirects(false)
    .on('response', res => {
      assert.equal(res.statusCode, 301);
      done();
    })
    .on('error', done);
});

test('should handle cookies', function (t, done) {
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
      assert.equal(data, 'abc');
      done();
    }));
});

test('should detect redirect loops', function (t, done) {
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
    assert.equal(err, 'Redirect loop detected: /more/data');
    done();
  })
  .pipe(concat());
});

test('should propagate errors', function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(404, 'No such file');

  getlet('http://example.com/simple/data')
  .on('error', function(err) {
    assert.equal(err, 'HTTP Error: 404');
    done();
  })
  .pipe(concat());
});

test('should unzip responses', function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .replyWithFile(200, __dirname + '/fixtures/response.txt.gz', {
      'content-encoding': 'gzip'
    });

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    assert.equal(data, 'This is compressed response!');
    done();
  }));
});

test('should inflate responses', function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .replyWithFile(200, __dirname + '/fixtures/response.txt.flate', {
      'content-encoding': 'deflate'
    });

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    assert.equal(data, 'This is compressed response!');
    done();
  }));
});

test('should decompress brotli responses', { skip: !getlet.BROTLI }, function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .replyWithFile(200, __dirname + '/fixtures/response.txt.br', {
      'content-encoding': 'br'
    });

  getlet('http://example.com/simple/data')
  .pipe(concat({
    encoding: 'string'
  }, function(data) {
    assert.equal(data, 'This is compressed response!');
    done();
  }));
});

test('should ignore empty reponses with gzip encoding', function (t, done) {
  nock('http://example.com')
    .get('/simple/data')
    .reply(200, '', {
      'content-encoding': 'gzip'
    });

  getlet('http://example.com/simple/data')
  .on('error', function(err) {
    assert.ok(err, 'should emit an error');
    done();
  })
  .pipe(concat());
});

test('abort', async function(t) {

  await t.test('should close stream', function (t, done) {
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
      assert.ok(e, 'should see abort error');
      assert.equal(e.code, 'ECONNRESET');
    })
    .pipe(truncate)
    .pipe(concat({ encoding: 'string'}, function(data) {
      assert.equal(data, 'abc');
      done();
    }));
  });

  await t.test('should not stream if already aborted', function (t, done) {
    nock('http://example.com')
      .get('/simple/data')
      .reply(200, 'abcabcabcabc');

    let g = getlet('http://example.com/simple/data');
    g.abort();

    g
    .pipe(concat({ encoding: 'string'}, function(data) {
      assert.equal(data, '');
      done();
    }));
  });


});

