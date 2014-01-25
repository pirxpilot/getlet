#getlet

HTTP(s) get request with redirect, compress and streaming

To be used if you only need HTTP GET, and if you'd rather have your response processed downstream.

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
    .path('/code42day/liftie/master/.jshintrc')
    .secure(true)
    .pipe(stream)
    .on('error', errorHandler); // errors are passed downstream
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

set header `name` to `value`

### `auth(username, password)`

sets basic authentication `Authorization` header

[request]: https://github.com/mikeal/request
[superagent]: http://visionmedia.github.io/superagent/