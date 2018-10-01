var ReconnectingWebSocket = (function () {
    'use strict';

    /*! *****************************************************************************
    Copyright (c) Microsoft Corporation. All rights reserved.
    Licensed under the Apache License, Version 2.0 (the "License"); you may not use
    this file except in compliance with the License. You may obtain a copy of the
    License at http://www.apache.org/licenses/LICENSE-2.0

    THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
    KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
    WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
    MERCHANTABLITY OR NON-INFRINGEMENT.

    See the Apache Version 2.0 License for specific language governing permissions
    and limitations under the License.
    ***************************************************************************** */
    /* global Reflect, Promise */

    var extendStatics = function(d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };

    function __extends(d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    }

    function __values(o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    }

    function __read(o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    }

    function __spread() {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    }

    var Event = /** @class */ (function () {
        function Event(type, target) {
            this.target = target;
            this.type = type;
        }
        return Event;
    }());
    var ErrorEvent = /** @class */ (function (_super) {
        __extends(ErrorEvent, _super);
        function ErrorEvent(error, target) {
            var _this = _super.call(this, 'error', target) || this;
            _this.message = error.message;
            _this.error = error;
            return _this;
        }
        return ErrorEvent;
    }(Event));
    var CloseEvent = /** @class */ (function (_super) {
        __extends(CloseEvent, _super);
        function CloseEvent(code, reason, target) {
            if (code === void 0) { code = 1000; }
            if (reason === void 0) { reason = ''; }
            var _this = _super.call(this, 'close', target) || this;
            _this.wasClean = true;
            _this.code = code;
            _this.reason = reason;
            return _this;
        }
        return CloseEvent;
    }(Event));

    var getGlobalWebSocket = function () {
        if (typeof WebSocket !== 'undefined') {
            // @ts-ignore
            return WebSocket;
        }
    };
    /**
     * Returns true if given argument looks like a WebSocket class
     */
    var isWebSocket = function (w) { return typeof w === 'function' && w.CLOSING === 2; };
    var DEFAULT = {
        maxReconnectionDelay: 10000,
        minReconnectionDelay: 1000 + Math.random() * 4000,
        minUptime: 5000,
        reconnectionDelayGrowFactor: 1.3,
        connectionTimeout: 4000,
        maxRetries: Infinity,
        debug: false,
    };
    var ReconnectingWebSocket = /** @class */ (function () {
        function ReconnectingWebSocket(url, protocols, options) {
            if (options === void 0) { options = {}; }
            this._listeners = {
                error: [],
                message: [],
                open: [],
                close: [],
            };
            this._retryCount = -1;
            this._shouldReconnect = true;
            this._connectLock = false;
            this._binaryType = 'blob';
            this._closeCalled = false;
            this._messageQueue = [];
            this.eventToHandler = new Map([
                ['open', this._handleOpen.bind(this)],
                ['close', this._handleClose.bind(this)],
                ['error', this._handleError.bind(this)],
                ['message', this._handleMessage.bind(this)],
            ]);
            /**
             * An event listener to be called when the WebSocket connection's readyState changes to CLOSED
             */
            this.onclose = undefined;
            /**
             * An event listener to be called when an error occurs
             */
            this.onerror = undefined;
            /**
             * An event listener to be called when a message is received from the server
             */
            this.onmessage = undefined;
            /**
             * An event listener to be called when the WebSocket connection's readyState changes to OPEN;
             * this indicates that the connection is ready to send and receive data
             */
            this.onopen = undefined;
            this._url = url;
            this._protocols = protocols;
            this._options = options;
            this._connect();
        }
        Object.defineProperty(ReconnectingWebSocket, "CONNECTING", {
            get: function () {
                return 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket, "OPEN", {
            get: function () {
                return 1;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket, "CLOSING", {
            get: function () {
                return 2;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket, "CLOSED", {
            get: function () {
                return 3;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "CONNECTING", {
            get: function () {
                return ReconnectingWebSocket.CONNECTING;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "OPEN", {
            get: function () {
                return ReconnectingWebSocket.OPEN;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "CLOSING", {
            get: function () {
                return ReconnectingWebSocket.CLOSING;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "CLOSED", {
            get: function () {
                return ReconnectingWebSocket.CLOSED;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "binaryType", {
            get: function () {
                return this._ws ? this._ws.binaryType : this._binaryType;
            },
            set: function (value) {
                this._binaryType = value;
                if (this._ws) {
                    // @ts-ignore
                    this._ws.binaryType = value;
                }
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "retryCount", {
            /**
             * Returns the number or connection retries
             */
            get: function () {
                return Math.max(this._retryCount, 0);
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "bufferedAmount", {
            /**
             * The number of bytes of data that have been queued using calls to send() but not yet
             * transmitted to the network. This value resets to zero once all queued data has been sent.
             * This value does not reset to zero when the connection is closed; if you keep calling send(),
             * this will continue to climb. Read only
             */
            get: function () {
                return this._ws ? this._ws.bufferedAmount : 0;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "extensions", {
            /**
             * The extensions selected by the server. This is currently only the empty string or a list of
             * extensions as negotiated by the connection
             */
            get: function () {
                return this._ws ? this._ws.extensions : '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "protocol", {
            /**
             * A string indicating the name of the sub-protocol the server selected;
             * this will be one of the strings specified in the protocols parameter when creating the
             * WebSocket object
             */
            get: function () {
                return this._ws ? this._ws.protocol : '';
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "readyState", {
            /**
             * The current state of the connection; this is one of the Ready state constants
             */
            get: function () {
                return this._ws ? this._ws.readyState : ReconnectingWebSocket.CONNECTING;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(ReconnectingWebSocket.prototype, "url", {
            /**
             * The URL as resolved by the constructor
             */
            get: function () {
                return this._ws ? this._ws.url : '';
            },
            enumerable: true,
            configurable: true
        });
        /**
         * Closes the WebSocket connection or connection attempt, if any. If the connection is already
         * CLOSED, this method does nothing
         */
        ReconnectingWebSocket.prototype.close = function (code, reason) {
            if (code === void 0) { code = 1000; }
            this._closeCalled = true;
            this._shouldReconnect = false;
            if (!this._ws) {
                this._debug('close enqueued: no ws instance');
                return;
            }
            if (this._ws.readyState === this.CLOSED) {
                this._debug('close: already closed');
                return;
            }
            this._ws.close(code, reason);
        };
        /**
         * Closes the WebSocket connection or connection attempt and connects again.
         * Resets retry counter;
         */
        ReconnectingWebSocket.prototype.reconnect = function (code, reason) {
            this._shouldReconnect = true;
            this._retryCount = -1;
            if (!this._ws || this._ws.readyState === this.CLOSED) {
                this._connect();
            }
            this._disconnect(code, reason);
            this._connect();
        };
        /**
         * Enqueue specified data to be transmitted to the server over the WebSocket connection
         */
        ReconnectingWebSocket.prototype.send = function (data) {
            if (this._ws) {
                this._debug('send', data);
                this._ws.send(data);
            }
            else {
                this._debug('enqueue', data);
                this._messageQueue.push(data);
            }
        };
        /**
         * Register an event handler of a specific event type
         */
        ReconnectingWebSocket.prototype.addEventListener = function (type, listener) {
            if (this._listeners[type]) {
                // @ts-ignore
                this._listeners[type].push(listener);
            }
        };
        /**
         * Removes an event listener
         */
        ReconnectingWebSocket.prototype.removeEventListener = function (type, listener) {
            if (this._listeners[type]) {
                // @ts-ignore
                this._listeners[type] = this._listeners[type].filter(function (l) { return l !== listener; });
            }
        };
        ReconnectingWebSocket.prototype._debug = function () {
            var params = [];
            for (var _i = 0; _i < arguments.length; _i++) {
                params[_i] = arguments[_i];
            }
            if (this._options.debug) {
                // tslint:disable-next-line
                console.log.apply(console, __spread(['RWS>'], params));
            }
        };
        ReconnectingWebSocket.prototype._getNextDelay = function () {
            var delay = 0;
            if (this._retryCount > 0) {
                var _a = this._options, _b = _a.reconnectionDelayGrowFactor, reconnectionDelayGrowFactor = _b === void 0 ? DEFAULT.reconnectionDelayGrowFactor : _b, _c = _a.minReconnectionDelay, minReconnectionDelay = _c === void 0 ? DEFAULT.minReconnectionDelay : _c, _d = _a.maxReconnectionDelay, maxReconnectionDelay = _d === void 0 ? DEFAULT.maxReconnectionDelay : _d;
                delay =
                    minReconnectionDelay + Math.pow(this._retryCount - 1, reconnectionDelayGrowFactor);
                if (delay > maxReconnectionDelay) {
                    delay = maxReconnectionDelay;
                }
            }
            this._debug('next delay', delay);
            return delay;
        };
        ReconnectingWebSocket.prototype._wait = function () {
            var _this = this;
            return new Promise(function (resolve) {
                setTimeout(resolve, _this._getNextDelay());
            });
        };
        /**
         * @return Promise<string>
         */
        ReconnectingWebSocket.prototype._getNextUrl = function (urlProvider) {
            if (typeof urlProvider === 'string') {
                return Promise.resolve(urlProvider);
            }
            if (typeof urlProvider === 'function') {
                var url = urlProvider();
                if (typeof url === 'string') {
                    return Promise.resolve(url);
                }
                if (url.then) {
                    return url;
                }
            }
            throw Error('Invalid URL');
        };
        ReconnectingWebSocket.prototype._connect = function () {
            var _this = this;
            if (this._connectLock || !this._shouldReconnect) {
                return;
            }
            this._connectLock = true;
            var _a = this._options, _b = _a.maxRetries, maxRetries = _b === void 0 ? DEFAULT.maxRetries : _b, _c = _a.connectionTimeout, connectionTimeout = _c === void 0 ? DEFAULT.connectionTimeout : _c, _d = _a.WebSocket, WebSocket = _d === void 0 ? getGlobalWebSocket() : _d;
            if (this._retryCount >= maxRetries) {
                this._debug('max retries reached', this._retryCount, '>=', maxRetries);
                return;
            }
            this._retryCount++;
            this._debug('connect', this._retryCount);
            this._removeListeners();
            if (!isWebSocket(WebSocket)) {
                throw Error('No valid WebSocket class provided');
            }
            this._wait()
                .then(function () { return _this._getNextUrl(_this._url); })
                .then(function (url) {
                _this._debug('connect', { url: url, protocols: _this._protocols });
                _this._ws = new WebSocket(url, _this._protocols);
                // @ts-ignore
                _this._ws.binaryType = _this._binaryType;
                _this._connectLock = false;
                _this._addListeners();
                // close could be called before creating the ws
                if (_this._closeCalled) {
                    _this._closeCalled = true;
                    _this._ws.close();
                }
                else {
                    _this._connectTimeout = setTimeout(function () { return _this._handleTimeout(); }, connectionTimeout);
                }
            });
        };
        ReconnectingWebSocket.prototype._handleTimeout = function () {
            this._debug('timeout event');
            this._handleError(new ErrorEvent(Error('TIMEOUT'), this));
        };
        ReconnectingWebSocket.prototype._disconnect = function (code, reason) {
            if (code === void 0) { code = 1000; }
            clearTimeout(this._connectTimeout);
            if (!this._ws) {
                return;
            }
            this._removeListeners();
            try {
                this._ws.close(code, reason);
                this._handleClose(new CloseEvent(code, reason, this));
            }
            catch (error) {
                // ignore
            }
        };
        ReconnectingWebSocket.prototype._acceptOpen = function () {
            this._retryCount = 0;
        };
        ReconnectingWebSocket.prototype._callEventListener = function (event, listener) {
            if ('handleEvent' in listener) {
                // @ts-ignore
                listener.handleEvent(event);
            }
            else {
                // @ts-ignore
                listener(event);
            }
        };
        ReconnectingWebSocket.prototype._handleOpen = function (event) {
            var _this = this;
            this._debug('open event');
            var _a = this._options.minUptime, minUptime = _a === void 0 ? DEFAULT.minUptime : _a;
            clearTimeout(this._connectTimeout);
            this._uptimeTimeout = setTimeout(function () { return _this._acceptOpen(); }, minUptime);
            this._debug('assign binary type');
            // @ts-ignore
            this._ws.binaryType = this._binaryType;
            // send enqueued messages (messages sent before websocket initialization)
            this._messageQueue.forEach(function (message) { return _this._ws.send(message); });
            this._messageQueue = [];
            if (this.onopen) {
                this.onopen(event);
            }
            this._listeners.open.forEach(function (listener) { return _this._callEventListener(event, listener); });
        };
        ReconnectingWebSocket.prototype._handleMessage = function (event) {
            var _this = this;
            this._debug('message event');
            if (this.onmessage) {
                this.onmessage(event);
            }
            this._listeners.message.forEach(function (listener) { return _this._callEventListener(event, listener); });
        };
        ReconnectingWebSocket.prototype._handleError = function (event) {
            var _this = this;
            this._debug('error event', event.message);
            this._disconnect(undefined, event.message === 'TIMEOUT' ? 'timeout' : undefined);
            if (this.onerror) {
                this.onerror(event);
            }
            this._debug('exec error listeners');
            this._listeners.error.forEach(function (listener) { return _this._callEventListener(event, listener); });
            this._connect();
        };
        ReconnectingWebSocket.prototype._handleClose = function (event) {
            var _this = this;
            this._debug('close event');
            if (this._shouldReconnect) {
                this._connect();
            }
            if (this.onclose) {
                this.onclose(event);
            }
            this._listeners.close.forEach(function (listener) { return _this._callEventListener(event, listener); });
        };
        /**
         * Remove event listeners to WebSocket instance
         */
        ReconnectingWebSocket.prototype._removeListeners = function () {
            var e_1, _a;
            if (!this._ws) {
                return;
            }
            this._debug('removeListeners');
            try {
                for (var _b = __values(this.eventToHandler), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), type = _d[0], handler = _d[1];
                    this._ws.removeEventListener(type, handler);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
        };
        /**
         * Assign event listeners to WebSocket instance
         */
        ReconnectingWebSocket.prototype._addListeners = function () {
            var e_2, _a;
            this._debug('addListeners');
            try {
                for (var _b = __values(this.eventToHandler), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), type = _d[0], handler = _d[1];
                    this._ws.addEventListener(type, handler);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_2) throw e_2.error; }
            }
        };
        return ReconnectingWebSocket;
    }());

    return ReconnectingWebSocket;

}());