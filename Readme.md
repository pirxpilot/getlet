[![Build Status](https://img.shields.io/travis/pirxpilot/getlet.svg)](http://travis-ci.org/pirxpilot/getlet)
[![Dependency Status](https://img.shields.io/gemnasium/pirxpilot/getlet.svg)](https://gemnasium.com/pirxpilot/getlet)
[![NPM version](https://img.shields.io/npm/v/getlet.svg)](http://badge.fury.io/js/getlet)

# getlet

HTTP(s) request with redirect, compress and streaming

To be used if you only need bare bones HTTP request and if you'd rather have your response processed downstream.

`getlet` will send the request, handle the redirects and pipe the response.
If you need anything more than this check [superagent] or [request].

`getlet` always asks for `gzip` or `deflate` encoding and decompresses the response,
but it won't do any other processing. It won't buffer the responses in any way.

## Examples

```javascript
  // get URL and stream it
  getlet('http://google.com').pipe(stream);

  // configure URL from host and part
  getlet()
    .host('raw2.github.com')
    .path('/pirxpilot/liftie/master/.jshintrc')
    .secure(true)
    .on('error', errorHandler)
    .pipe(stream);

  // post some data
  getlet('https//example.com/form')
    .method('POST')
    .send(formData)
    .pipe(stream);

```

## API


### `getlet(url)`

`url` is an optional parameter - alternatively you can configure target using `host` and `path`

### `host(host)`

### `path(path)`

### `secure(on)`

if `on` is truthy use HTTPS instead of HTTP

### `userAgent(ua)`

set `User-Agent` header

### `header(name, value)`

set header `name` to `value`, also accepts an object treated as `name` ->` value`

### `auth(username, password)`

sets basic authentication `Authorization` header

### `send(data)`

sends `data` with the request

### `method(method)`

uses HTTP `method` (`POST`, `PUT` etc) - `GET` is used if `method` is not called


[request]: https://github.com/mikeal/request
[superagent]: http://visionmedia.github.io/superagent/
