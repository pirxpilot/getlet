const getlet = require('..');
const nock = require('nock');
const concat = require('concat-stream');

/* global describe, it */

describe('getlet', function() {

  it('should request simple data', function(done) {
    nock('http://example.com')
      .matchHeader('accept-encoding', 'gzip, deflate')
      .get('/simple/data')
      .reply(200, 'abc');

    getlet('http://example.com/simple/data').pipe(concat({
      encoding: 'string'
    }, function(data) {
      data.should.eql('abc');
      done();
    }));
  });

  it('should post data', function(done) {
    nock('http://example.com')
      .post('/simple/data', '123')
      .reply(200, 'cde');

    getlet('http://example.com/simple/data')
      .method('POST')
      .send('123')
      .pipe(concat({ encoding: 'string' }, function(data) {
        data.should.eql('cde');
        done();
      }));
  });

  it('should support host and path simple data', function(done) {
    nock('http://example.com')
      .get('/simple/data')
      .reply(200, 'abc');

    getlet().host('example.com').path('/simple/data').pipe(concat({
      encoding: 'string'
    }, function(data) {
      data.should.eql('abc');
      done();
    }));
  });

  it('should support HTTPs', function(done) {
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
      data.should.eql('abc');
      done();
    }));
  });

  it('should support custom headers', function(done) {
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
      data.should.eql('abc');
      done();
    }));
  });

  it('should support multiple headers', function(done) {
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
      data.should.eql('abc');
      done();
    }));
  });

  it('should follow redirects', function(done) {
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
      data.should.eql('abc');
      done();
    }));
  });

  it('should detect redirect loops', function(done) {
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
    .pipe(concat())
    .on('error', function(err) {
      err.should.eql('Redirect loop detected: /more/data');
      done();
    });
  });

  it('should propagate errors', function(done) {
    nock('http://example.com')
      .get('/simple/data')
      .reply(404, 'No such file');

    getlet('http://example.com/simple/data')
    .pipe(concat())
    .on('error', function(err) {
      err.should.eql('HTTP Error: 404');
      done();
    });
  });

  it('should unzip responses', function(done) {
    nock('http://example.com')
      .get('/simple/data')
      .replyWithFile(200, __dirname + '/response.txt.gz', {
        'content-encoding': 'gzip'
      });

    getlet('http://example.com/simple/data')
    .pipe(concat({
      encoding: 'string'
    }, function(data) {
      data.should.eql('This is compressed response!');
      done();
    }));
  });
});
