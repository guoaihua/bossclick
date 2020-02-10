(function () {
  var log = console.info, $err = console.error, rand = Math.random, $wait = setTimeout,
    win = window, nativeStr = ' [native code]',
    isNative = f => (f + '').indexOf(nativeStr) > 0,
    nativeCode = 'function () { [native code] }',
    def = Object.defineProperty;
  const Block = {
    proxy() {
      var Key = 'navigator'
      def(window, Key, {
        value: new Proxy(navigator, {
          get(t, k) {
            var v = t[k]
            $err('assess %s.%s = %o', Key, k, v)
            return v
          }
        })
      })
      return this
    },
    notify() {
      var O = Notification, K = 'permission', val = 'denied'
      if (O[K] == val) { return }
      function geter() { return val }
      geter.toString = function () { return nativeCode }
      def(O, K, { get: geter })
      return this
    },
    ip() {
      delete win.RTCPeerConnection
      delete win.webkitRTCPeerConnection
      delete win.mozRTCPeerConnection;
      return this
    },
    plugins() {
      ['mimeTypes', 'plugins'].map(x => navigator.__proto__.__defineGetter__(x, function () { return { length: 0 } }));
      return this
    },
    storage() {
      ; ((win, props) => {
        var f = (prop, name) => (a, b) => log('%s.%s(%s,%s)', prop, name, a, b, new Error)
        props.map(x => def(win, x, {
          value: ['removeItem', 'setItem', 'getItem', 'clear']
            .reduce((a, b) => (a[b] = f(x, b), a), {})
        }))
      })(win, ['localStorage', 'sessionStorage']);
      return this
    },
    canvas() {
      ; ((a, b) => {
        var c = a[b], s = c + ''
        if (!isNative(c)) { return }
        a['_' + b] = c
        a[b] = function (...args) {
          var [txt, x, y] = args, t = this, r = rand();
          log('block canvas %o %s(%s) in random %s \n%s', t, b, args + '', r, new Error)
          return c.apply(t, [r, ~~(10 + rand() * 100), ~~(10 + rand() * 80)])
        }
        a[b].toString = () => s
      })(CanvasRenderingContext2D.prototype, 'fillText');
      return this
    },
    screen(size) {
      if (!size || !size.splice || size.length < 2) {
        size = [1920, 1080]
      }
      var [w, h] = size;
      [[win.screen.__proto__, {
        availWidth: w, availHeight: h, width: w, height: h
      }],
        [win, {
          // 因为浏览器顶部地址栏存在 innerHeight 比 outerHeight 大约少 68px
          outerWidth: w, outerHeight: h, innerWidth: w, innerHeight: h - 68
        }]].map(x => {
        var [target, sets] = x;
        Object.keys(sets).map(x => def(target, x, { get() { return sets[x] } }))
      })
      return this
    },
    gpu() {
      var prop = WebGLRenderingContext.prototype, fname = 'getParameter',
        raw = prop[fname];
      prop[fname] = function (id) {
        var val = raw.call(this, id), r;
        switch (typeof val) {
          case 'number':
            r = 0;
            break
          case 'string':
            r = ''
            break
        }
        log('read gpu %s(%o) = %o \tbut return %o', fname, id, val, r)
        return r
      }
      return this
    },
    ajax() {
      ; (ajax => {
        var open = ajax.open, send = ajax.send, fn;
        function blockAjax() {
          if (ajax.open != fn) {
            ajax.open = fn = function (...args) {
              var t = this, url = (args[1] || '').toLowerCase();
              if (config.block.find(x => url.indexOf(x) > -1)) {
                log('ajax block %s', url)
                return t.send = function (data) {
                  log('ajax block url(%s) sent %o', url, data)
                }
              }
              return open.apply(t, args)
            }
          }
          $wait(blockAjax, 1e2)
        }
        blockAjax()
      })(XMLHttpRequest.prototype);
      return this
    },
    json() {
      ; ((a, b) => {
        b.map(x => {
          var c = win[a][x], save = win.Math,
            list = save[`_${x}`] = [];
          if (!isNative(c)) { return }
          return win[a][x] = function (r) {
            log('%s.%s(%o)', a, x, r)
            var v = r;
            if (x == 'parse') {
              v = c(r)
              if (v.validateToken) {
                save._result = v
                var cb = save._cb;
                typeof cb === 'function' && cb(v)
              }
            }
            list.push(v)
            return c(r)
          }
        })
      })('JSON', ['parse', 'stringify']);
      return this
    }
  }
  //必须删除webdriver
  delete navigator.__proto__.webdriver
  //Block.canvas().proxy().notify()//.storage();
  //选择屏蔽项目
  if (typeof config === 'object') {
    if (typeof config.screen != 'undefined') {
      Block.screen(config.screen)
    }
  }
})();
