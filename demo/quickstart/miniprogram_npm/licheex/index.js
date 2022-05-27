module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1653582160878, function(require, module, exports) {
var __TEMP__ = require('./utils/is');var isString = __TEMP__['isString'];var isArray = __TEMP__['isArray'];var isFunc = __TEMP__['isFunc'];
var __TEMP__ = require('./emitter');var EventEmitter = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./innerPlugins');var _innerPlugins = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./mapGettersToState');var mapGettersToState = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./createHelpers');var createHelpers = __REQUIRE_DEFAULT__(__TEMP__);var createConnectHelpers = __TEMP__['createConnectHelpers'];
var __TEMP__ = require('./dataTransform');var setDataByStateProps = __TEMP__['setDataByStateProps'];var setStoreDataByState = __TEMP__['setStoreDataByState'];
var __TEMP__ = require('./wrapDataInstance');var wrapDataInstance = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./global');var global = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./connect');var connect = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./provider');var GlobalStore = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./mapHelpersToMethod');var mapActionsToMethod = __TEMP__['mapActionsToMethod'];var mapMutationsToMethod = __TEMP__['mapMutationsToMethod'];
var __TEMP__ = require('./storeConfigPreHandle');var configPreHandler = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./utils/wrapState');var wrapState = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./mixins/default');var defaultMixin = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./Watcher');var Watcher = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./polyfill/index');

function getPath(link) {
  return isString(link) && link.split('/')[1];
}

class Store {
  constructor(store, options) {
    this.$global = global;
    this.$emitter = new EventEmitter();
    // 预处理配置转化
    configPreHandler(store);
    Object.assign(this, {
      connectGlobal: store.connectGlobal,
      mapGlobals: store.mapGlobals,
      actions: store.actions,
      methods: store.methods || {},
      mutations: store.mutations || {},
      plugins: store.plugins || [],
      getters: store.getters || {},
      instanceName: store.namespace || store.instanceName
    });
    //@todo  微信小程序不支持，需要转换成 $watch
    this.stateConfig = mapGettersToState(store.state || {}, this.getters, this);
    this.stateConfig.$global = this.connectGlobal ? global.getGlobalState(this.mapGlobals) : {};
    this.subscribe = this.subscribe.bind(this);
    this.register = this.register.bind(this);
    this.subscribeAction = this.subscribeAction.bind(this);
    this.when = this.when.bind(this);
    this.watch = this.watch.bind(this);
  }
  getInstance() {
    return this.storeInstance;
  }
  watch(predicate, effect) {
    this.when(predicate, effect, true);
  }
  // 实现 mobx when
  when (predicate, effect, isWatch) {
    const emitter = this.$emitter;
    if (!predicate) return Promise.reject();
    return new Promise((resolve) => {
      const initialData = this.storeInstance ? this.storeInstance.data : {};
      if (predicate(initialData)) {
        if (effect) {
          effect.call(this, initialData);
        }
        return resolve(initialData);
      }
      const dispose = emitter.addListener('updateState', ({ state, mutation, prevState }) => {
        const newData = setStoreDataByState(this.storeInstance.data, state);
        const currentPageInstance = getCurrentPages().pop() || {};
        const instanceView = this.storeInstance.$viewId || -1;
        const currentView = currentPageInstance.$viewId || -1;
        // 已经不在当前页面的不再触发
        if (instanceView === currentView) {
          if (predicate(newData)) {
            dispose();
            if (effect) {
              effect.call(this, newData);
            }
            resolve(newData);
          }
        }
      });
    });
  }
  // 实现 store.subscribe
  subscribe (subscriber, actionSubscriber) {
    const emitter = this.$emitter;
    const originViewInstance = getCurrentPages().pop() || {};
    if (subscriber) {
      this.storeUpdateLisitenerDispose = emitter.addListener('updateState', ({ state, mutation, prevState }) => {
        const currentPageInstance = getCurrentPages().pop() || {};
        const instanceView = originViewInstance.$viewId || -1;
        const currentView = currentPageInstance.$viewId || -1;
        // 已经不在当前页面的不再触发
        if (instanceView === currentView) {
          subscriber(mutation, wrapState({ ...this.storeInstance.data }), wrapState({ ...prevState }));
        }
      });
    }
    if (actionSubscriber) {
      this.storeDispatchActionLisitenerDispose = emitter.addListener('dispatchAction', (action, next) => {
        actionSubscriber(action, next);
      });
    }
  };
  subscribeAction(actionSubscriber) {
    const emitter = this.$emitter;
    const originViewInstance = getCurrentPages().pop() || {};
    if (actionSubscriber) {
      emitter.addListener('dispatchAction', (action, next) => {
        const currentPageInstance = getCurrentPages().pop() || {};
        const instanceView = originViewInstance.$viewId || -1;
        const currentView = currentPageInstance.$viewId || -1;
        if (instanceView === currentView) {
          return actionSubscriber(action, next);
        }
      });
    }
  }
  use(option = defaultMixin) {
    if (isFunc(option)) {
      return option.call(this, this.register, global);
    } else {
      return this.register(option);
    }
  }
  register(config = {}) {
    const that = this;
    config.data = config.data || {};
    // 初始化数据
    // @todo 不能直接复制，需求区分处理
    Object.assign(config.data, this.stateConfig, config.state);

    const initialState = { ...config.data };
    const originOnLoad = config.onLoad;
    const originOnUnload = config.onUnload;
    const originOnShow = config.onShow;
    const originOnHide = config.onHide;
    const emitter = this.$emitter;
    // mappers
    if (config.mapActionsToMethod) {
      mapActionsToMethod(config.mapActionsToMethod, this.actions, config);
    }
    if (config.methods) {
      mapMutationsToMethod(config.methods, config);
    }
    if (config.mapMutationsToMethod) {
      mapMutationsToMethod(config.mapMutationsToMethod, config);
    }
    config.onHide = function() {
      const currentPageInstance = getCurrentPages().pop() || {};
      global.emitter.emitEvent('updateCurrentPath', {
        from: getPath(currentPageInstance.route),
        fromViewId: currentPageInstance.$viewId || -1
      });
      originOnHide && originOnHide.apply(this, arguments);
      this._isHided = true;
    };
    config.onUnload = function() {
      const currentPageInstance = getCurrentPages().pop() || {};
      global.emitter.emitEvent('updateCurrentPath', {
        from: getPath(currentPageInstance.route)
      });
      this.licheexUpdateLisitener && this.licheexUpdateLisitener();
      this.licheexUpdateLisitenerGlobal && this.licheexUpdateLisitenerGlobal();
      if (this.$store) {
        this.$store.storeUpdateLisitenerDispose && this.$store.storeUpdateLisitenerDispose();
        this.$store.storeDispatchActionLisitenerDispose && this.$store.storeDispatchActionLisitenerDispose();
      }
      originOnUnload && originOnUnload.apply(this, arguments);
    };
    config.onShow = function(d) {
      const currentPageInstance = getCurrentPages().pop() || {};
      // 消费 Resume 字段
      const resumeData = global.messageManager.pop('$RESUME') || {};
      global.emitter.emitEvent('updateCurrentPath', Object.assign(currentPageInstance.$routeConfig || {}, {
        currentPath: getPath(currentPageInstance.route),
        context: resumeData
      }));
      // 如果有开全局，先触发
      if (that.connectGlobal) {
        // sync global data
        emitter.emitEvent('updateState', {
          state: {
            ...this.data,
            $global: {
              ...this.data.$global,
              ...global.getGlobalState(this.mapGlobals)
            }
          },
          mutation: {
            type: 'sync_global_data'
          },
          prevState: this.data
        });
      }
      originOnShow && originOnShow.apply(this, arguments);
      if (this._isHided) {
        config.onResume && config.onResume.call(this, Object.assign({}, d, resumeData));
        this._isHided = false;
      }
    };
    config.onLoad = function(query) {
      const onloadInstance = this;
      this.$emitter = emitter;
      this.$globalEmitter = global.emitter;
      this.$message = global.messageManager;
      this.$store = that;
      this.$when = that.when;

      if (!this.__watcher || !(this.__watcher instanceof Watcher)) {
        this.__watcher = new Watcher(this);
      }
        // 先榜上更新 store 的 监听器
      this.licheexUpdateLisitener = emitter.addListener('updateState', ({ state }) => {
        const newData = setStoreDataByState(this.data, state);
        const currentPageInstance = getCurrentPages().pop() || {};
        const instanceView = onloadInstance.$viewId || -1;
        const currentView = currentPageInstance.$viewId || -1;
        // 已经不在当前页面的不再触发
        if (instanceView === currentView) {
          this.setData(newData);
        }
      });
      if (that.connectGlobal) {
       // 立马触发同步
        emitter.emitEvent('updateState', {
          state: {
            ...this.data,
            $global: {
              ...this.data.$global,
              ...global.getGlobalState(this.mapGlobals)
            }
          },
          mutation: {
            type: 'sync_global_data'
          },
          prevState: this.data
        });

        // 增加nextprops的关联
        this.licheexUpdateLisitenerGlobal = global.emitter.addListener('updateGlobalStore', () => {
          const currentPageInstance = getCurrentPages().pop() || {};
          const instanceView = onloadInstance.$viewId || -1;
          const currentView = currentPageInstance.$viewId || -1;
          // 已经不在当前页面的不再触发
          if (instanceView !== currentView) return;
          emitter.emitEvent('updateState', {
            state: {
              ...this.data,
              $global: {
                ...this.data.$global,
                ...global.getGlobalState(this.mapGlobals)
              }
            },
            mutation: {
              type: 'sync_global_data'
            },
            prevState: this.data
          });
        });
      }
      this.subscribe = that.subscribe;
      this.subscribeAction = that.subscribeAction;
      // 设置页面 path 和 query
      const currentPageInstance = getCurrentPages().pop() || {};
      const currentPath = getPath(currentPageInstance.route);
      // 外面携带的数据
      const contextData = global.messageManager.pop('$RESUME') || {};
      const viewId = currentPageInstance.$viewId || -1;
      this.$routeConfig = {
        currentPath,
        query,
        context: contextData,
        viewId
      };
      global.emitter.emitEvent('updateCurrentPath', this.$routeConfig);
      // query.$context = loadData;
      that.storeInstance = this;
      const name = that.instanceName || currentPath || viewId || -1;
      // 把命名空间灌到实例
      this.instanceName = name;
      global.registerInstance(name, {
        config: { actions: that.actions, mutations: that.mutations, state: initialState },
        store: that,
        name,
        currentPath,
        viewId
      });
      if (that.plugins) {
        that.plugins.forEach(element => {
          const pluginFunc = isString(element) ? _innerPlugins[element] : element;
          pluginFunc(that.storeInstance);
        });
      }
      // 绑定属性关系
      Object.defineProperty(this, 'state', {
        get: function() { return wrapDataInstance(this.data); }
      });
      this.$getters = wrapDataInstance(this.state.$getters);
      // this.$global = wrapDataInstance({ ...this.state.$global });
      // 获取其他 store 的只读数据
      this.$getState = function(name) {
        if (!name) return this.state;
        return global.getState(name);
      };
      this.$getRef = function(name) {
        return global.getComponentRef(name);
      };

      if (originOnLoad) {
        originOnLoad.call(this, query, contextData);
      }
    };
    console.log(config.data)
    return {
      ...config,
      ...createHelpers.call(this, that.actions, that.mutations, that.$emitter)
    };
  }
  // connect(options) {
  //   const { mapStateToProps = [], mapGettersToProps } = options;
  //   const that = this;
  //   return function (config) {
  //     const _didMount = config.didMount;
  //     Object.assign(that.mutations, config.mutations || {});
  //     return {
  //       ...config,
  //       methods: {
  //         ...config.methods,
  //         ...createConnectHelpers.call(this, that)
  //       },
  //       didMount() {
  //         const initialData = setDataByStateProps(mapStateToProps, that.getInstance().data, config, mapGettersToProps);
  //         this.setData(initialData);
  //         if (mapStateToProps) {
  //           that.$emitter.addListener('updateState', ({state = {}}) => {
  //             const nextData = setDataByStateProps(mapStateToProps, state, config, mapGettersToProps);
  //             this.setData(nextData);
  //           });
  //         }
  //         if (typeof _didMount === 'function') {
  //           _didMount.call(this);
  //         }
  //       }
  //     };
  //   };
  // }
}

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = Store;
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, 'connect', { enumerable: true, configurable: true, get: function() { return connect; } });Object.defineProperty(exports, 'GlobalStore', { enumerable: true, configurable: true, get: function() { return GlobalStore; } });




}, function(modId) {var map = {"./utils/is":1653582160879,"./emitter":1653582160880,"./innerPlugins":1653582160881,"./mapGettersToState":1653582160883,"./createHelpers":1653582160890,"./dataTransform":1653582160891,"./wrapDataInstance":1653582160884,"./global":1653582160888,"./connect":1653582160892,"./provider":1653582160894,"./mapHelpersToMethod":1653582160893,"./storeConfigPreHandle":1653582160895,"./utils/wrapState":1653582160889,"./mixins/default":1653582160896,"./Watcher":1653582160897,"./polyfill/index":1653582160900}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160879, function(require, module, exports) {
// {%TITLE=判断%}

// -------------------- 常用数据类型判断 ------------------------------

// 输入任意类型, 判断是否是 array 类型
var isArray = Array.isArray || function isArray(obj) {
  return Object.prototype.toString.call(obj) === '[object Array]';
};

// 判断是否为 object 对象
/**
 * Solves equations of the form a * x = b
 * @example <caption>Example usage of method1.</caption>
 * {%isObject%}
 * @returns {Number} Returns the value of x for the equation.
 */
function isObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]';
};

function isString(str) {
  return Object.prototype.toString.call(str) === '[object String]';
};

function isPromise(e) {
  return !!e && typeof e.then === 'function';
};

function isSymbol(d) {
  return Object.prototype.toString.call(d) === '[object Symbol]';
}

function isFunc(fuc) {
  const t = Object.prototype.toString.call(fuc);
  return t === '[object Function]' || t === '[object AsyncFunction]';
}
// TODO: is empty

function isEmptyObject(obj) {
  if (!isObject(obj)) {
    return false;
  }
  return !Object.keys(obj).length;
}

function canParseJson(string) {
  try {
    return JSON.parse(string);
  } catch (e) {
    return false;
  }
}

function isTelNum(mobile) {
  return mobile && /^1\d{10}$/.test(mobile);
}

// ------------------- 常用设备的系统判断, android or ios ------------

function isIOS() {
  return /iPhone|iTouch|iPad/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

module.exports = {
  isArray,
  isObject,
  isString,
  isEmptyObject,
  isSymbol,
  isFunc,
  isPromise,
  canParseJson,
  // -------
  isTelNum,
  // ------
  isIOS,
  isAndroid
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160880, function(require, module, exports) {
function EventEmitter() {}

var proto = EventEmitter.prototype;
var originalGlobalValue = exports.EventEmitter;

function indexOfListener(listeners, listener) {
  var i = listeners.length;
  while (i--) {
    if (listeners[i].listener === listener) {
      return i;
    }
  }

  return -1;
}

function alias(name) {
  return function aliasClosure() {
    return this[name].apply(this, arguments);
  };
}

proto.getListeners = function getListeners(evt) {
  var events = this._getEvents();
  var response;
  var key;

  if (evt instanceof RegExp) {
    response = {};
    for (key in events) {
      if (events.hasOwnProperty(key) && evt.test(key)) {
        response[key] = events[key];
      }
    }
  } else {
    response = events[evt] || (events[evt] = []);
  }

  return response;
};

/**
 * Takes a list of listener objects and flattens it into a list of listener functions.
 *
 * @param {Object[]} listeners Raw listener objects.
 * @return {Function[]} Just the listener functions.
 */
proto.flattenListeners = function flattenListeners(listeners) {
  var flatListeners = [];
  var i;

  for (i = 0; i < listeners.length; i += 1) {
    flatListeners.push(listeners[i].listener);
  }

  return flatListeners;
};

/**
 * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
 *
 * @param {String|RegExp} evt Name of the event to return the listeners from.
 * @return {Object} All listener functions for an event in an object.
 */
proto.getListenersAsObject = function getListenersAsObject(evt) {
  var listeners = this.getListeners(evt);
  var response;

  if (listeners instanceof Array) {
    response = {};
    response[evt] = listeners;
  }

  return response || listeners;
};

function isValidListener(listener) {
  if (typeof listener === 'function' || listener instanceof RegExp) {
    return true;
  } else if (listener && typeof listener === 'object') {
    return isValidListener(listener.listener);
  } else {
    return false;
  }
}

proto.addListener = function addListener(evt, listener) {
  if (!isValidListener(listener)) {
    throw new TypeError('listener must be a function');
  }

  var listeners = this.getListenersAsObject(evt);
  var listenerIsWrapped = typeof listener === 'object';
  var key;
  var uid;
  for (key in listeners) {
    if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
      uid = `lisitener_${key}_${new Date().getTime()}`;
      listeners[key].push(listenerIsWrapped ? listener : {
        listener: listener,
        once: false,
        uid
      });
    }
  }
  return function() {
    const removeIndex = listeners[key].findIndex(o => o.uid === uid);
    if (removeIndex !== -1) {
      listeners[key].splice(removeIndex, 1);
    }
    return proto;
  };
};

proto.on = alias('addListener');

proto.addOnceListener = function addOnceListener(evt, listener) {
  return this.addListener(evt, {
    listener: listener,
    once: true
  });
};

proto.once = alias('addOnceListener');

proto.defineEvent = function defineEvent(evt) {
  this.getListeners(evt);
  return this;
};

proto.defineEvents = function defineEvents(evts) {
  for (var i = 0; i < evts.length; i += 1) {
    this.defineEvent(evts[i]);
  }
  return this;
};

proto.removeListener = function removeListener(evt, listener) {
  var listeners = this.getListenersAsObject(evt);
  var index;
  var key;

  for (key in listeners) {
    if (listeners.hasOwnProperty(key)) {
      index = indexOfListener(listeners[key], listener);
      if (index !== -1) {
        listeners[key].splice(index, 1);
      }
    }
  }

  return this;
};

proto.off = alias('removeListener');

proto.addListeners = function addListeners(evt, listeners) {
  return this.manipulateListeners(false, evt, listeners);
};

proto.removeListeners = function removeListeners(evt, listeners) {
  return this.manipulateListeners(true, evt, listeners);
};

proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
  var i;
  var value;
  var single = remove ? this.removeListener : this.addListener;
  var multiple = remove ? this.removeListeners : this.addListeners;

    // If evt is an object then pass each of its properties to this method
  if (typeof evt === 'object' && !(evt instanceof RegExp)) {
    for (i in evt) {
      if (evt.hasOwnProperty(i) && (value = evt[i])) {
        if (typeof value === 'function') {
          single.call(this, i, value);
        } else {
          multiple.call(this, i, value);
        }
      }
    }
  } else {
    i = listeners.length;
    while (i--) {
      single.call(this, evt, listeners[i]);
    }
  }

  return this;
};

proto.removeEvent = function removeEvent(evt) {
  var type = typeof evt;
  var events = this._getEvents();
  var key;
  if (type === 'string') {
    delete events[evt];
  } else if (evt instanceof RegExp) {
        // Remove all events matching the regex.
    for (key in events) {
      if (events.hasOwnProperty(key) && evt.test(key)) {
        delete events[key];
      }
    }
  } else {
    delete this._events;
  }

  return this;
};

proto.removeAllListeners = alias('removeEvent');

proto.emitEvent = function emitEvent(evt, args) {
  var listenersMap = this.getListenersAsObject(evt);
  var listeners;
  var listener;
  var i;
  var key;
  var response;
  for (key in listenersMap) {
    if (listenersMap.hasOwnProperty(key)) {
      listeners = listenersMap[key].slice(0);

      for (i = 0; i < listeners.length; i++) {
        listener = listeners[i];
        if (listener.once === true) {
          this.removeListener(evt, listener.listener);
        }
        response = listener.listener.call(this, args || []);
        if (response === this._getOnceReturnValue()) {
          this.removeListener(evt, listener.listener);
        }
      }
    }
  }

  return this;
};

proto.emitEventChain = function emitEventWithNext(evt, args, cb = d => d) {
  var listenersMap = this.getListenersAsObject(evt);
  var listeners;
  var key;
  for (key in listenersMap) {
    if (listenersMap.hasOwnProperty(key)) {
      listeners = listenersMap[key].slice(0);
      listeners.push({
        listener: function(action, next, last = {}) {
          // 最后一个回调获取最终上一次的结果
          cb(last);
        }
      });
      const that = this;
      (function createNextFunc(i) {
        const listener = listeners[i];
        if (!listener) {
          return d => d;
        }
        if (listener.once === true) {
          this.removeListener(evt, listener.listener);
        }
        return listener.listener.bind(that, args || [], createNextFunc(i + 1));
      })(0)();
    }
  }
  return this;
};

proto.trigger = alias('emitEvent');
proto.emit = function emit(evt) {
  var args = Array.prototype.slice.call(arguments, 1);
  return this.emitEvent(evt, args);
};

proto.setOnceReturnValue = function setOnceReturnValue(value) {
  this._onceReturnValue = value;
  return this;
};

proto._getOnceReturnValue = function _getOnceReturnValue() {
  if (this.hasOwnProperty('_onceReturnValue')) {
    return this._onceReturnValue;
  } else {
    return true;
  }
};

proto._getEvents = function _getEvents() {
  return this._events || (this._events = {});
};

EventEmitter.noConflict = function noConflict() {
  exports.EventEmitter = originalGlobalValue;
  return EventEmitter;
};

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = EventEmitter;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160881, function(require, module, exports) {
var __TEMP__ = require('./logger');var Logger = __REQUIRE_DEFAULT__(__TEMP__);

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = {
  logger: Logger()
};

}, function(modId) { var map = {"./logger":1653582160882}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160882, function(require, module, exports) {
var __TEMP__ = require('./utils/is');var isString = __TEMP__['isString'];var isSymbol = __TEMP__['isSymbol'];

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function logger (option = {}) {
  return function (store) {
    store.subscribe((mutation, state, prevState) => {
      const payload = isString(mutation.payload) ? mutation.payload : { ...mutation.payload };
      console.info(`%c ${store.instanceName}Store:prev state`, 'color: #9E9E9E; font-weight: bold', prevState);
      console.info(`%c ${store.instanceName}Store:mutation: ${mutation.type}`, 'color: #03A9F4; font-weight: bold', payload, new Date().getTime());
      console.info(`%c ${store.instanceName}Store:next state`, 'color: #4CAF50; font-weight: bold', state);
    }, (action = {}, next) => {
      let type = isSymbol(action.type) ? action.type.toString() : action.type;
      const payload = isString(action.payload) ? action.payload : { ...action.payload };
      console.info(`%c ${store.instanceName}Store:action ${type} dispatching`, 'color: #9E9E9E; font-weight: bold', payload);
      next();
    });
  };
};exports.default = logger

}, function(modId) { var map = {"./utils/is":1653582160879}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160883, function(require, module, exports) {
var __TEMP__ = require('./utils/is');var isFunc = __TEMP__['isFunc'];
var __TEMP__ = require('./wrapDataInstance');var wrapInstance = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./global');var global = __REQUIRE_DEFAULT__(__TEMP__);

function filterObjectByKey(array, object) {
  return array.reduce((p, v) => {
    if (object && object[v] !== undefined) {
      p[v] = object[v];
    }
    return p;
  }, {});
};
// 微信小程序不支持，需要转换成 $watch
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function mapGettersToState(state, getters = {}, store) {
  const result = { ...state };
  result.$getters = Object.keys(getters).reduce((p, v) => {
    const funcExec = getters[v];
    p[v] = {};
    Object.defineProperty(p, v, {
      get: function() {
        const globalData = store.connectGlobal ? global.getGlobalState(store.mapGlobal) : {};
        const instance = store.getInstance() ? (store.getInstance().state || {}) : (this || {});
        if (isFunc(funcExec)) {
          const params = filterObjectByKey(Object.keys(state), instance);
          return funcExec.call(this, wrapInstance(params), wrapInstance(instance.$getters), wrapInstance(globalData), global.getState);
        }
        return funcExec;
      }
    });
    return p;
  }, {});
  return result;
};exports.default = mapGettersToState

}, function(modId) { var map = {"./utils/is":1653582160879,"./wrapDataInstance":1653582160884,"./global":1653582160888}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160884, function(require, module, exports) {
var __TEMP__ = require('./utils/manipulate');var getIn = __TEMP__['getIn'];var setIn = __TEMP__['setIn'];var deleteIn = __TEMP__['deleteIn'];var compose = __TEMP__['compose'];var produce = __TEMP__['produce'];var update = __TEMP__['update'];
var __TEMP__ = require('./utils/is');var isArray = __TEMP__['isArray'];var isString = __TEMP__['isString'];
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = function(instance = {}, context) {
  // 当实例不是引用则不做wrap
  if (isString(instance) || typeof instance === 'number' || typeof instance === 'boolean') return instance;
  instance.getIn = function(path, initial, ...funcs) {
    const ctx = context ? context.data : this;
    const pathArray = isString(path) ? [path] : path;
    const result = getIn(ctx, pathArray, initial);
    if (funcs.length) {
      return compose([result].concat(funcs));
    }
    return result;
  };
  instance.setIn = function(path, initial) {
    const ctx = context ? context.data : this;
    const pathArray = isString(path) ? [path] : path;
    return setIn(ctx, pathArray, initial);
  };
  instance.deleteIn = function(path) {
    const ctx = context ? context.data : this;
    const pathArray = isString(path) ? [path] : path;
    return deleteIn(ctx, pathArray);
  };
  // use immutablity helper
  instance.$update = function(manipulate) {
    const ctx = context ? context.data : this;
    return update(ctx, manipulate);
  };
  // use immer
  instance.$produce = function(manipulate) {
    const ctx = context ? context.data : this;
    return produce(ctx, manipulate);
  };

  instance.compose = function(...args) {
    const ctx = context ? context.data : this;
    let composeArray = isArray(args[0]) ? args[0] : args;
    composeArray.unshift(ctx);
    return compose(composeArray);
  };
  return instance;
};

}, function(modId) { var map = {"./utils/manipulate":1653582160885,"./utils/is":1653582160879}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160885, function(require, module, exports) {
// {%TITLE=操作%}
var __TEMP__ = require('./is');var isFunc = __TEMP__['isFunc'];var isArray = __TEMP__['isArray'];var isObject = __TEMP__['isObject'];
var __TEMP__ = require('../libs/immutability-helper-enhanced/index');var update = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('../libs/immer/index');var produce = __REQUIRE_DEFAULT__(__TEMP__);

/**
 * @desc 从一个对象通过操作序列来拿里面的值，做了基本防空措施
 * @param {object} state - 需要获取的数据源
 * @param {array} array - 操作路径
 * @param {any} initial - 默认值，当没有内容的时候
 * @example <caption>Example usage of getIn.</caption>
 * // testcase
 * {%common%}
 * // getIn
 * {%getIn%}
 * @returns {any} expected - 获取的值
 */
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function getIn(state, array, initial = null) {
  let obj = Object.assign({}, state);

  for (let i = 0; i < array.length; i++) {
    // when is undefined return init immediately
    if (typeof obj !== 'object' || obj === null) {
      return initial;
    }

    const prop = array[i];

    obj = obj[prop];
  }
  if (obj === undefined || obj === null) {
    return initial;
  }

  return obj;
};exports.getIn = getIn

/**
 * @desc 一个对象通过操作序列来设置里面的值，做到自动添加值
 * @param {object} state - 需要获取的数据源
 * @param {array} array - 操作路径
 * @param {any} initial - 默认值，当没有内容的时候
 * @example <caption>Example usage of setIn.</caption>
 * // testcase
 * {%common%}
 * // setIn
 * {%setIn%}
 * @returns {any} expected - 返回操作完成后新的值
 */
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function setIn(state, array, value) {
  if (!array) return state;
  const setRecursively = function(state, array, value, index) {
    let clone = {};
    let prop = array[index];
    let newState;

    if (array.length > index) {
      // get cloned object
      if (isArray(state)) {
        clone = state.slice(0);
      } else {
        clone = Object.assign({}, state);
      }
      // not exists, make new {}
      newState = ((isObject(state) || isArray(state)) && state[prop] !== undefined) ? state[prop] : {};
      clone[prop] = setRecursively(newState, array, value, index + 1);
      return clone;
    }

    return value;
  };

  return setRecursively(state, array, value, 0);
};exports.setIn = setIn

/**
 * @desc 一个对象通过操作序列来删除里面的值, 做到防空, 返回新值
 * @param {object} state - 需要获取的数据源
 * @param {array} array - 操作路径
 * @example <caption>Example usage of deleteIn.</caption>
 * // testcase
 * {%common%}
 * // deleteIn
 * {%deleteIn%}
 * @returns {any} expected - 返回删除后新的对象 or 值
 */
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function deleteIn(state, array) {
  const deleteRecursively = function (state, array, index) {
    let clone = {};
    let prop = array[index];

    // not exists, just return, delete nothing
    if (!isObject(state) || state[prop] === undefined) {
      return state;
    }

    // not last one, just clone
    if (array.length - 1 !== index) {
      if (Array.isArray(state)) {
        clone = state.slice();
      } else {
        clone = Object.assign({}, state);
      }

      clone[prop] = deleteRecursively(state[prop], array, index + 1);

      return clone;
    }

    // delete here
    if (Array.isArray(state)) {
      clone = [].concat(state.slice(0, prop), state.slice(prop + 1));
    } else {
      clone = Object.assign({}, state);
      delete clone[prop];
    }

    return clone;
  };

  return deleteRecursively(state, array, 0);
};exports.deleteIn = deleteIn

/**
 * @desc 将一组操作通过 array 的形式 reduce 组合
 * @param {array} array - 组合方式
 * @example <caption>Example usage of compose.</caption>
 * {%compose%}
 */
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function compose(array) {
  return array.reduce((p, v) => {
    if (isFunc(v)) {
      return v(p);
    }
    if (isArray(v) && isFunc(v[0])) {
      return v[0](p, ...v.slice(1));
    }
    return p;
  });
};exports.compose = compose
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });Object.defineProperty(exports, 'update', { enumerable: true, configurable: true, get: function() { return update; } });Object.defineProperty(exports, 'produce', { enumerable: true, configurable: true, get: function() { return produce; } });

}, function(modId) { var map = {"./is":1653582160879,"../libs/immutability-helper-enhanced/index":1653582160886,"../libs/immer/index":1653582160887}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160886, function(require, module, exports) {
module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1653582160815, function(require, module, exports) {
var invariant = require('./invariant');
var hasOwnProperty = Object.prototype.hasOwnProperty;
var splice = Array.prototype.splice;

var toString = Object.prototype.toString
var type = function(obj) {
  return toString.call(obj).slice(8, -1);
}

var assign = Object.assign || /* istanbul ignore next */ function assign(target, source) {
  getAllKeys(source).forEach(function(key) {
    if (hasOwnProperty.call(source, key)) {
      target[key] = source[key];
    }
  });
  return target;
};

var getAllKeys = typeof Object.getOwnPropertySymbols === 'function' ?
  function(obj) { return Object.keys(obj).concat(Object.getOwnPropertySymbols(obj)) } :
  /* istanbul ignore next */ function(obj) { return Object.keys(obj) };

/* istanbul ignore next */
function copy(object) {
  if (Array.isArray(object)) {
    return assign(object.constructor(object.length), object)
  } else if (type(object) === 'Map') {
    return new Map(object)
  } else if (type(object) === 'Set') {
    return new Set(object)
  } else if (object && typeof object === 'object') {
    var prototype = Object.getPrototypeOf(object);
    return assign(Object.create(prototype), object);
  } else {
    return object;
  }
}

function newContext() {
  var commands = assign({}, defaultCommands);
  update.extend = function(directive, fn) {
    commands[directive] = fn;
  };
  update.isEquals = function(a, b) { return a === b; };

  return update;

  function update(object, spec) {
    if (typeof spec === 'function') {
      spec = { $apply: spec };
    }

    if (!(Array.isArray(object) && Array.isArray(spec))) {
      invariant(
        !Array.isArray(spec),
        'update(): You provided an invalid spec to update(). The spec may ' +
        'not contain an array except as the value of $set, $push, $unshift, ' +
        '$splice or any custom command allowing an array value.'
      );
    }

    invariant(
      typeof spec === 'object' && spec !== null,
      'update(): You provided an invalid spec to update(). The spec and ' +
      'every included key path must be plain objects containing one of the ' +
      'following commands: %s.',
      Object.keys(commands).join(', ')
    );

    var nextObject = object;
    var index, key;
    getAllKeys(spec).forEach(function(key) {
      if (hasOwnProperty.call(commands, key)) {
        var objectWasNextObject = object === nextObject;
        nextObject = commands[key](spec[key], nextObject, spec, object);
        if (objectWasNextObject && update.isEquals(nextObject, object)) {
          nextObject = object;
        }
      } else {
        var nextValueForKey =
          type(object) === 'Map'
            ? update(object.get(key), spec[key])
            : update(object[key], spec[key]);
        var nextObjectValue =
          type(nextObject) === 'Map'
              ? nextObject.get(key)
              : nextObject[key];
        if (!update.isEquals(nextValueForKey, nextObjectValue) || typeof nextValueForKey === 'undefined' && !hasOwnProperty.call(object, key)) {
          if (nextObject === object) {
            nextObject = copy(object);
          }
          if (type(nextObject) === 'Map') {
            nextObject.set(key, nextValueForKey);
          } else {
            nextObject[key] = nextValueForKey;
          }
        }
      }
    })
    return nextObject;
  }

}

var defaultCommands = {
  $push: function(value, nextObject, spec) {
    invariantPushAndUnshift(nextObject, spec, '$push');
    return value.length ? nextObject.concat(value) : nextObject;
  },
  $unshift: function(value, nextObject, spec) {
    invariantPushAndUnshift(nextObject, spec, '$unshift');
    return value.length ? value.concat(nextObject) : nextObject;
  },
  $splice: function(value, nextObject, spec, originalObject) {
    invariantSplices(nextObject, spec);
    value.forEach(function(args) {
      invariantSplice(args);
      if (nextObject === originalObject && args.length) nextObject = copy(originalObject);
      splice.apply(nextObject, args);
    });
    return nextObject;
  },
  $set: function(value, nextObject, spec) {
    invariantSet(spec);
    return value;
  },
  $toggle: function(targets, nextObject) {
    invariantSpecArray(targets, '$toggle');
    var nextObjectCopy = targets.length ? copy(nextObject) : nextObject;

    targets.forEach(function(target) {
      nextObjectCopy[target] = !nextObject[target];
    });

    return nextObjectCopy;
  },
  $unset: function(value, nextObject, spec, originalObject) {
    invariantSpecArray(value, '$unset');
    value.forEach(function(key) {
      if (Object.hasOwnProperty.call(nextObject, key)) {
        if (nextObject === originalObject) nextObject = copy(originalObject);
        delete nextObject[key];
      }
    });
    return nextObject;
  },
  $add: function(value, nextObject, spec, originalObject) {
    invariantMapOrSet(nextObject, '$add');
    invariantSpecArray(value, '$add');
    if (type(nextObject) === 'Map') {
      value.forEach(function(pair) {
        var key = pair[0];
        var value = pair[1];
        if (nextObject === originalObject && nextObject.get(key) !== value) nextObject = copy(originalObject);
        nextObject.set(key, value);
      });
    } else {
      value.forEach(function(value) {
        if (nextObject === originalObject && !nextObject.has(value)) nextObject = copy(originalObject);
        nextObject.add(value);
      });
    }
    return nextObject;
  },
  $remove: function(value, nextObject, spec, originalObject) {
    invariantMapOrSet(nextObject, '$remove');
    invariantSpecArray(value, '$remove');
    value.forEach(function(key) {
      if (nextObject === originalObject && nextObject.has(key)) nextObject = copy(originalObject);
      nextObject.delete(key);
    });
    return nextObject;
  },
  $merge: function(value, nextObject, spec, originalObject) {
    invariantMerge(nextObject, value);
    getAllKeys(value).forEach(function(key) {
      if (value[key] !== nextObject[key]) {
        if (nextObject === originalObject) nextObject = copy(originalObject);
        nextObject[key] = value[key];
      }
    });
    return nextObject;
  },
  $apply: function(value, original) {
    invariantApply(value);
    return value(original);
  }
};

var contextForExport = newContext();

module.exports = contextForExport;
module.exports.default = contextForExport;
module.exports.newContext = newContext;

// invariants

function invariantPushAndUnshift(value, spec, command) {
  invariant(
    Array.isArray(value),
    'update(): expected target of %s to be an array; got %s.',
    command,
    value
  );
  invariantSpecArray(spec[command], command)
}

function invariantSpecArray(spec, command) {
  invariant(
    Array.isArray(spec),
    'update(): expected spec of %s to be an array; got %s. ' +
    'Did you forget to wrap your parameter in an array?',
    command,
    spec
  );
}

function invariantSplices(value, spec) {
  invariant(
    Array.isArray(value),
    'Expected $splice target to be an array; got %s',
    value
  );
  invariantSplice(spec['$splice']);
}

function invariantSplice(value) {
  invariant(
    Array.isArray(value),
    'update(): expected spec of $splice to be an array of arrays; got %s. ' +
    'Did you forget to wrap your parameters in an array?',
    value
  );
}

function invariantApply(fn) {
  invariant(
    typeof fn === 'function',
    'update(): expected spec of $apply to be a function; got %s.',
    fn
  );
}

function invariantSet(spec) {
  invariant(
    Object.keys(spec).length === 1,
    'Cannot have more than one key in an object with $set'
  );
}

function invariantMerge(target, specValue) {
  invariant(
    specValue && typeof specValue === 'object',
    'update(): $merge expects a spec of type \'object\'; got %s',
    specValue
  );
  invariant(
    target && typeof target === 'object',
    'update(): $merge expects a target of type \'object\'; got %s',
    target
  );
}

function invariantMapOrSet(target, command) {
  var typeOfTarget = type(target);
  invariant(
    typeOfTarget === 'Map' || typeOfTarget === 'Set',
    'update(): %s expects a target of type Set or Map; got %s',
    command,
    typeOfTarget
  );
}

}, function(modId) {var map = {"./invariant":1653582160816}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160816, function(require, module, exports) {
// https://github.com/zertosh/invariant/blob/master/browser.js
/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */



/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  // if (process.env.NODE_ENV !== 'production') {
  //   if (format === undefined) {
  //     throw new Error('invariant requires an error message argument');
  //   }
  // }
  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
      error.name = 'Invariant Violation';
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1653582160815);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160887, function(require, module, exports) {
module.exports = (function() {
var __MODS__ = {};
var __DEFINE__ = function(modId, func, req) { var m = { exports: {}, _tempexports: {} }; __MODS__[modId] = { status: 0, func: func, req: req, m: m }; };
var __REQUIRE__ = function(modId, source) { if(!__MODS__[modId]) return require(source); if(!__MODS__[modId].status) { var m = __MODS__[modId].m; m._exports = m._tempexports; var desp = Object.getOwnPropertyDescriptor(m, "exports"); if (desp && desp.configurable) Object.defineProperty(m, "exports", { set: function (val) { if(typeof val === "object" && val !== m._exports) { m._exports.__proto__ = val.__proto__; Object.keys(val).forEach(function (k) { m._exports[k] = val[k]; }); } m._tempexports = val }, get: function () { return m._tempexports; } }); __MODS__[modId].status = 1; __MODS__[modId].func(__MODS__[modId].req, m, m.exports); } return __MODS__[modId].m.exports; };
var __REQUIRE_WILDCARD__ = function(obj) { if(obj && obj.__esModule) { return obj; } else { var newObj = {}; if(obj != null) { for(var k in obj) { if (Object.prototype.hasOwnProperty.call(obj, k)) newObj[k] = obj[k]; } } newObj.default = obj; return newObj; } };
var __REQUIRE_DEFAULT__ = function(obj) { return obj && obj.__esModule ? obj.default : obj; };
__DEFINE__(1653582160812, function(require, module, exports) {


  module.exports = require('./immer.cjs.production.min.js')

}, function(modId) {var map = {"./immer.cjs.production.min.js":1653582160813,"./immer.cjs.development.js":1653582160814}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160813, function(require, module, exports) {
function n(n){for(var t=arguments.length,r=Array(t>1?t-1:0),e=1;e<t;e++)r[e-1]=arguments[e];throw Error("[Immer] minified error nr: "+n+(r.length?" "+r.map((function(n){return"'"+n+"'"})).join(","):"")+". Find the full error at: https://bit.ly/3cXEKWf")}function t(n){return!!n&&!!n[H]}function r(n){return!!n&&(function(n){if(!n||"object"!=typeof n)return!1;var t=Object.getPrototypeOf(n);if(null===t)return!0;var r=Object.hasOwnProperty.call(t,"constructor")&&t.constructor;return r===Object||"function"==typeof r&&Function.toString.call(r)===Q}(n)||Array.isArray(n)||!!n[G]||!!n.constructor[G]||c(n)||v(n))}function e(n,t,r){void 0===r&&(r=!1),0===i(n)?(r?Object.keys:T)(n).forEach((function(e){r&&"symbol"==typeof e||t(e,n[e],n)})):n.forEach((function(r,e){return t(e,r,n)}))}function i(n){var t=n[H];return t?t.t>3?t.t-4:t.t:Array.isArray(n)?1:c(n)?2:v(n)?3:0}function u(n,t){return 2===i(n)?n.has(t):Object.prototype.hasOwnProperty.call(n,t)}function o(n,t){return 2===i(n)?n.get(t):n[t]}function f(n,t,r){var e=i(n);2===e?n.set(t,r):3===e?(n.delete(t),n.add(r)):n[t]=r}function a(n,t){return n===t?0!==n||1/n==1/t:n!=n&&t!=t}function c(n){return W&&n instanceof Map}function v(n){return X&&n instanceof Set}function s(n){return n.i||n.u}function p(n){if(Array.isArray(n))return Array.prototype.slice.call(n);var t=U(n);delete t[H];for(var r=T(t),e=0;e<r.length;e++){var i=r[e],u=t[i];!1===u.writable&&(u.writable=!0,u.configurable=!0),(u.get||u.set)&&(t[i]={configurable:!0,writable:!0,enumerable:u.enumerable,value:n[i]})}return Object.create(Object.getPrototypeOf(n),t)}function l(n,u){return void 0===u&&(u=!1),h(n)||t(n)||!r(n)?n:(i(n)>1&&(n.set=n.add=n.clear=n.delete=d),Object.freeze(n),u&&e(n,(function(n,t){return l(t,!0)}),!0),n)}function d(){n(2)}function h(n){return null==n||"object"!=typeof n||Object.isFrozen(n)}function y(t){var r=V[t];return r||n(18,t),r}function _(n,t){V[n]||(V[n]=t)}function b(){return J}function m(n,t){t&&(y("Patches"),n.o=[],n.v=[],n.s=t)}function j(n){O(n),n.p.forEach(w),n.p=null}function O(n){n===J&&(J=n.l)}function x(n){return J={p:[],l:J,h:n,_:!0,m:0}}function w(n){var t=n[H];0===t.t||1===t.t?t.j():t.O=!0}function S(t,e){e.m=e.p.length;var i=e.p[0],u=void 0!==t&&t!==i;return e.h.S||y("ES5").P(e,t,u),u?(i[H].M&&(j(e),n(4)),r(t)&&(t=P(e,t),e.l||g(e,t)),e.o&&y("Patches").g(i[H].u,t,e.o,e.v)):t=P(e,i,[]),j(e),e.o&&e.s(e.o,e.v),t!==B?t:void 0}function P(n,t,r){if(h(t))return t;var i=t[H];if(!i)return e(t,(function(e,u){return M(n,i,t,e,u,r)}),!0),t;if(i.A!==n)return t;if(!i.M)return g(n,i.u,!0),i.u;if(!i.R){i.R=!0,i.A.m--;var u=4===i.t||5===i.t?i.i=p(i.k):i.i;e(3===i.t?new Set(u):u,(function(t,e){return M(n,i,u,t,e,r)})),g(n,u,!1),r&&n.o&&y("Patches").F(i,r,n.o,n.v)}return i.i}function M(n,e,i,o,a,c){if(t(a)){var v=P(n,a,c&&e&&3!==e.t&&!u(e.D,o)?c.concat(o):void 0);if(f(i,o,v),!t(v))return;n._=!1}if(r(a)&&!h(a)){if(!n.h.K&&n.m<1)return;P(n,a),e&&e.A.l||g(n,a)}}function g(n,t,r){void 0===r&&(r=!1),n.h.K&&n._&&l(t,r)}function A(n,t){var r=n[H];return(r?s(r):n)[t]}function z(n,t){if(t in n)for(var r=Object.getPrototypeOf(n);r;){var e=Object.getOwnPropertyDescriptor(r,t);if(e)return e;r=Object.getPrototypeOf(r)}}function E(n){n.M||(n.M=!0,n.l&&E(n.l))}function R(n){n.i||(n.i=p(n.u))}function k(n,t,r){var e=c(t)?y("MapSet").$(t,r):v(t)?y("MapSet").C(t,r):n.S?function(n,t){var r=Array.isArray(n),e={t:r?1:0,A:t?t.A:b(),M:!1,R:!1,D:{},l:t,u:n,k:null,i:null,j:null,I:!1},i=e,u=Y;r&&(i=[e],u=Z);var o=Proxy.revocable(i,u),f=o.revoke,a=o.proxy;return e.k=a,e.j=f,a}(t,r):y("ES5").J(t,r);return(r?r.A:b()).p.push(e),e}function F(u){return t(u)||n(22,u),function n(t){if(!r(t))return t;var u,a=t[H],c=i(t);if(a){if(!a.M&&(a.t<4||!y("ES5").N(a)))return a.u;a.R=!0,u=D(t,c),a.R=!1}else u=D(t,c);return e(u,(function(t,r){a&&o(a.u,t)===r||f(u,t,n(r))})),3===c?new Set(u):u}(u)}function D(n,t){switch(t){case 2:return new Map(n);case 3:return Array.from(n)}return p(n)}function K(){function n(n,t){var r=f[n];return r?r.enumerable=t:f[n]=r={configurable:!0,enumerable:t,get:function(){return Y.get(this[H],n)},set:function(t){Y.set(this[H],n,t)}},r}function r(n){for(var t=n.length-1;t>=0;t--){var r=n[t][H];if(!r.M)switch(r.t){case 5:o(r)&&E(r);break;case 4:i(r)&&E(r)}}}function i(n){for(var t=n.u,r=n.k,e=T(r),i=e.length-1;i>=0;i--){var o=e[i];if(o!==H){var f=t[o];if(void 0===f&&!u(t,o))return!0;var c=r[o],v=c&&c[H];if(v?v.u!==f:!a(c,f))return!0}}var s=!!t[H];return e.length!==T(t).length+(s?0:1)}function o(n){var t=n.k;if(t.length!==n.u.length)return!0;var r=Object.getOwnPropertyDescriptor(t,t.length-1);if(r&&!r.get)return!0;for(var e=0;e<t.length;e++)if(!t.hasOwnProperty(e))return!0;return!1}var f={};_("ES5",{J:function(t,r){var e=Array.isArray(t),i=function(t,r){if(t){for(var e=Array(r.length),i=0;i<r.length;i++)Object.defineProperty(e,""+i,n(i,!0));return e}var u=U(r);delete u[H];for(var o=T(u),f=0;f<o.length;f++){var a=o[f];u[a]=n(a,t||!!u[a].enumerable)}return Object.create(Object.getPrototypeOf(r),u)}(e,t),u={t:e?5:4,A:r?r.A:b(),M:!1,R:!1,D:{},l:r,u:t,k:i,i:null,O:!1,I:!1};return Object.defineProperty(i,H,{value:u,writable:!0}),i},P:function(n,i,f){f?t(i)&&i[H].A===n&&r(n.p):(n.o&&function n(t){if(t&&"object"==typeof t){var r=t[H];if(r){var i=r.u,f=r.k,a=r.D,c=r.t;if(4===c)e(f,(function(t){t!==H&&(void 0!==i[t]||u(i,t)?a[t]||n(f[t]):(a[t]=!0,E(r)))})),e(i,(function(n){void 0!==f[n]||u(f,n)||(a[n]=!1,E(r))}));else if(5===c){if(o(r)&&(E(r),a.length=!0),f.length<i.length)for(var v=f.length;v<i.length;v++)a[v]=!1;else for(var s=i.length;s<f.length;s++)a[s]=!0;for(var p=Math.min(f.length,i.length),l=0;l<p;l++)f.hasOwnProperty(l)||(a[l]=!0),void 0===a[l]&&n(f[l])}}}}(n.p[0]),r(n.p))},N:function(n){return 4===n.t?i(n):o(n)}})}function $(){function f(n){if(!r(n))return n;if(Array.isArray(n))return n.map(f);if(c(n))return new Map(Array.from(n.entries()).map((function(n){return[n[0],f(n[1])]})));if(v(n))return new Set(Array.from(n).map(f));var t=Object.create(Object.getPrototypeOf(n));for(var e in n)t[e]=f(n[e]);return u(n,G)&&(t[G]=n[G]),t}function a(n){return t(n)?f(n):n}var s="add";_("Patches",{W:function(t,r){return r.forEach((function(r){for(var e=r.path,u=r.op,a=t,c=0;c<e.length-1;c++){var v=i(a),p=""+e[c];0!==v&&1!==v||"__proto__"!==p&&"constructor"!==p||n(24),"function"==typeof a&&"prototype"===p&&n(24),"object"!=typeof(a=o(a,p))&&n(15,e.join("/"))}var l=i(a),d=f(r.value),h=e[e.length-1];switch(u){case"replace":switch(l){case 2:return a.set(h,d);case 3:n(16);default:return a[h]=d}case s:switch(l){case 1:return"-"===h?a.push(d):a.splice(h,0,d);case 2:return a.set(h,d);case 3:return a.add(d);default:return a[h]=d}case"remove":switch(l){case 1:return a.splice(h,1);case 2:return a.delete(h);case 3:return a.delete(r.value);default:return delete a[h]}default:n(17,u)}})),t},F:function(n,t,r,i){switch(n.t){case 0:case 4:case 2:return function(n,t,r,i){var f=n.u,c=n.i;e(n.D,(function(n,e){var v=o(f,n),p=o(c,n),l=e?u(f,n)?"replace":s:"remove";if(v!==p||"replace"!==l){var d=t.concat(n);r.push("remove"===l?{op:l,path:d}:{op:l,path:d,value:p}),i.push(l===s?{op:"remove",path:d}:"remove"===l?{op:s,path:d,value:a(v)}:{op:"replace",path:d,value:a(v)})}}))}(n,t,r,i);case 5:case 1:return function(n,t,r,e){var i=n.u,u=n.D,o=n.i;if(o.length<i.length){var f=[o,i];i=f[0],o=f[1];var c=[e,r];r=c[0],e=c[1]}for(var v=0;v<i.length;v++)if(u[v]&&o[v]!==i[v]){var p=t.concat([v]);r.push({op:"replace",path:p,value:a(o[v])}),e.push({op:"replace",path:p,value:a(i[v])})}for(var l=i.length;l<o.length;l++){var d=t.concat([l]);r.push({op:s,path:d,value:a(o[l])})}i.length<o.length&&e.push({op:"replace",path:t.concat(["length"]),value:i.length})}(n,t,r,i);case 3:return function(n,t,r,e){var i=n.u,u=n.i,o=0;i.forEach((function(n){if(!u.has(n)){var i=t.concat([o]);r.push({op:"remove",path:i,value:n}),e.unshift({op:s,path:i,value:n})}o++})),o=0,u.forEach((function(n){if(!i.has(n)){var u=t.concat([o]);r.push({op:s,path:u,value:n}),e.unshift({op:"remove",path:u,value:n})}o++}))}(n,t,r,i)}},g:function(n,t,r,e){r.push({op:"replace",path:[],value:t===B?void 0:t}),e.push({op:"replace",path:[],value:n})}})}function C(){function t(n,t){function r(){this.constructor=n}f(n,t),n.prototype=(r.prototype=t.prototype,new r)}function i(n){n.i||(n.D=new Map,n.i=new Map(n.u))}function u(n){n.i||(n.i=new Set,n.u.forEach((function(t){if(r(t)){var e=k(n.A.h,t,n);n.p.set(t,e),n.i.add(e)}else n.i.add(t)})))}function o(t){t.O&&n(3,JSON.stringify(s(t)))}var f=function(n,t){return(f=Object.setPrototypeOf||{__proto__:[]}instanceof Array&&function(n,t){n.__proto__=t}||function(n,t){for(var r in t)t.hasOwnProperty(r)&&(n[r]=t[r])})(n,t)},a=function(){function n(n,t){return this[H]={t:2,l:t,A:t?t.A:b(),M:!1,R:!1,i:void 0,D:void 0,u:n,k:this,I:!1,O:!1},this}t(n,Map);var u=n.prototype;return Object.defineProperty(u,"size",{get:function(){return s(this[H]).size}}),u.has=function(n){return s(this[H]).has(n)},u.set=function(n,t){var r=this[H];return o(r),s(r).has(n)&&s(r).get(n)===t||(i(r),E(r),r.D.set(n,!0),r.i.set(n,t),r.D.set(n,!0)),this},u.delete=function(n){if(!this.has(n))return!1;var t=this[H];return o(t),i(t),E(t),t.u.has(n)?t.D.set(n,!1):t.D.delete(n),t.i.delete(n),!0},u.clear=function(){var n=this[H];o(n),s(n).size&&(i(n),E(n),n.D=new Map,e(n.u,(function(t){n.D.set(t,!1)})),n.i.clear())},u.forEach=function(n,t){var r=this;s(this[H]).forEach((function(e,i){n.call(t,r.get(i),i,r)}))},u.get=function(n){var t=this[H];o(t);var e=s(t).get(n);if(t.R||!r(e))return e;if(e!==t.u.get(n))return e;var u=k(t.A.h,e,t);return i(t),t.i.set(n,u),u},u.keys=function(){return s(this[H]).keys()},u.values=function(){var n,t=this,r=this.keys();return(n={})[L]=function(){return t.values()},n.next=function(){var n=r.next();return n.done?n:{done:!1,value:t.get(n.value)}},n},u.entries=function(){var n,t=this,r=this.keys();return(n={})[L]=function(){return t.entries()},n.next=function(){var n=r.next();if(n.done)return n;var e=t.get(n.value);return{done:!1,value:[n.value,e]}},n},u[L]=function(){return this.entries()},n}(),c=function(){function n(n,t){return this[H]={t:3,l:t,A:t?t.A:b(),M:!1,R:!1,i:void 0,u:n,k:this,p:new Map,O:!1,I:!1},this}t(n,Set);var r=n.prototype;return Object.defineProperty(r,"size",{get:function(){return s(this[H]).size}}),r.has=function(n){var t=this[H];return o(t),t.i?!!t.i.has(n)||!(!t.p.has(n)||!t.i.has(t.p.get(n))):t.u.has(n)},r.add=function(n){var t=this[H];return o(t),this.has(n)||(u(t),E(t),t.i.add(n)),this},r.delete=function(n){if(!this.has(n))return!1;var t=this[H];return o(t),u(t),E(t),t.i.delete(n)||!!t.p.has(n)&&t.i.delete(t.p.get(n))},r.clear=function(){var n=this[H];o(n),s(n).size&&(u(n),E(n),n.i.clear())},r.values=function(){var n=this[H];return o(n),u(n),n.i.values()},r.entries=function(){var n=this[H];return o(n),u(n),n.i.entries()},r.keys=function(){return this.values()},r[L]=function(){return this.values()},r.forEach=function(n,t){for(var r=this.values(),e=r.next();!e.done;)n.call(t,e.value,e.value,this),e=r.next()},n}();_("MapSet",{$:function(n,t){return new a(n,t)},C:function(n,t){return new c(n,t)}})}var I;Object.defineProperty(exports,"__esModule",{value:!0});var J,N="undefined"!=typeof Symbol&&"symbol"==typeof Symbol("x"),W="undefined"!=typeof Map,X="undefined"!=typeof Set,q="undefined"!=typeof Proxy&&void 0!==Proxy.revocable&&"undefined"!=typeof Reflect,B=N?Symbol.for("immer-nothing"):((I={})["immer-nothing"]=!0,I),G=N?Symbol.for("immer-draftable"):"__$immer_draftable",H=N?Symbol.for("immer-state"):"__$immer_state",L="undefined"!=typeof Symbol&&Symbol.iterator||"@@iterator",Q=""+Object.prototype.constructor,T="undefined"!=typeof Reflect&&Reflect.ownKeys?Reflect.ownKeys:void 0!==Object.getOwnPropertySymbols?function(n){return Object.getOwnPropertyNames(n).concat(Object.getOwnPropertySymbols(n))}:Object.getOwnPropertyNames,U=Object.getOwnPropertyDescriptors||function(n){var t={};return T(n).forEach((function(r){t[r]=Object.getOwnPropertyDescriptor(n,r)})),t},V={},Y={get:function(n,t){if(t===H)return n;var e=s(n);if(!u(e,t))return function(n,t,r){var e,i=z(t,r);return i?"value"in i?i.value:null===(e=i.get)||void 0===e?void 0:e.call(n.k):void 0}(n,e,t);var i=e[t];return n.R||!r(i)?i:i===A(n.u,t)?(R(n),n.i[t]=k(n.A.h,i,n)):i},has:function(n,t){return t in s(n)},ownKeys:function(n){return Reflect.ownKeys(s(n))},set:function(n,t,r){var e=z(s(n),t);if(null==e?void 0:e.set)return e.set.call(n.k,r),!0;if(!n.M){var i=A(s(n),t),o=null==i?void 0:i[H];if(o&&o.u===r)return n.i[t]=r,n.D[t]=!1,!0;if(a(r,i)&&(void 0!==r||u(n.u,t)))return!0;R(n),E(n)}return n.i[t]===r&&"number"!=typeof r&&(void 0!==r||t in n.i)||(n.i[t]=r,n.D[t]=!0,!0)},deleteProperty:function(n,t){return void 0!==A(n.u,t)||t in n.u?(n.D[t]=!1,R(n),E(n)):delete n.D[t],n.i&&delete n.i[t],!0},getOwnPropertyDescriptor:function(n,t){var r=s(n),e=Reflect.getOwnPropertyDescriptor(r,t);return e?{writable:!0,configurable:1!==n.t||"length"!==t,enumerable:e.enumerable,value:r[t]}:e},defineProperty:function(){n(11)},getPrototypeOf:function(n){return Object.getPrototypeOf(n.u)},setPrototypeOf:function(){n(12)}},Z={};e(Y,(function(n,t){Z[n]=function(){return arguments[0]=arguments[0][0],t.apply(this,arguments)}})),Z.deleteProperty=function(n,t){return Z.set.call(this,n,t,void 0)},Z.set=function(n,t,r){return Y.set.call(this,n[0],t,r,n[0])};var nn=function(){function e(t){var e=this;this.S=q,this.K=!0,this.produce=function(t,i,u){if("function"==typeof t&&"function"!=typeof i){var o=i;i=t;var f=e;return function(n){var t=this;void 0===n&&(n=o);for(var r=arguments.length,e=Array(r>1?r-1:0),u=1;u<r;u++)e[u-1]=arguments[u];return f.produce(n,(function(n){var r;return(r=i).call.apply(r,[t,n].concat(e))}))}}var a;if("function"!=typeof i&&n(6),void 0!==u&&"function"!=typeof u&&n(7),r(t)){var c=x(e),v=k(e,t,void 0),s=!0;try{a=i(v),s=!1}finally{s?j(c):O(c)}return"undefined"!=typeof Promise&&a instanceof Promise?a.then((function(n){return m(c,u),S(n,c)}),(function(n){throw j(c),n})):(m(c,u),S(a,c))}if(!t||"object"!=typeof t){if(void 0===(a=i(t))&&(a=t),a===B&&(a=void 0),e.K&&l(a,!0),u){var p=[],d=[];y("Patches").g(t,a,p,d),u(p,d)}return a}n(21,t)},this.produceWithPatches=function(n,t){if("function"==typeof n)return function(t){for(var r=arguments.length,i=Array(r>1?r-1:0),u=1;u<r;u++)i[u-1]=arguments[u];return e.produceWithPatches(t,(function(t){return n.apply(void 0,[t].concat(i))}))};var r,i,u=e.produce(n,t,(function(n,t){r=n,i=t}));return"undefined"!=typeof Promise&&u instanceof Promise?u.then((function(n){return[n,r,i]})):[u,r,i]},"boolean"==typeof(null==t?void 0:t.useProxies)&&this.setUseProxies(t.useProxies),"boolean"==typeof(null==t?void 0:t.autoFreeze)&&this.setAutoFreeze(t.autoFreeze)}var i=e.prototype;return i.createDraft=function(e){r(e)||n(8),t(e)&&(e=F(e));var i=x(this),u=k(this,e,void 0);return u[H].I=!0,O(i),u},i.finishDraft=function(n,t){var r=(n&&n[H]).A;return m(r,t),S(void 0,r)},i.setAutoFreeze=function(n){this.K=n},i.setUseProxies=function(t){t&&!q&&n(20),this.S=t},i.applyPatches=function(n,r){var e;for(e=r.length-1;e>=0;e--){var i=r[e];if(0===i.path.length&&"replace"===i.op){n=i.value;break}}e>-1&&(r=r.slice(e+1));var u=y("Patches").W;return t(n)?u(n,r):this.produce(n,(function(n){return u(n,r)}))},e}(),tn=new nn,rn=tn.produce,en=tn.produceWithPatches.bind(tn),un=tn.setAutoFreeze.bind(tn),on=tn.setUseProxies.bind(tn),fn=tn.applyPatches.bind(tn),an=tn.createDraft.bind(tn),cn=tn.finishDraft.bind(tn);exports.Immer=nn,exports.applyPatches=fn,exports.castDraft=function(n){return n},exports.castImmutable=function(n){return n},exports.createDraft=an,exports.current=F,exports.default=rn,exports.enableAllPlugins=function(){K(),C(),$()},exports.enableES5=K,exports.enableMapSet=C,exports.enablePatches=$,exports.finishDraft=cn,exports.freeze=l,exports.immerable=G,exports.isDraft=t,exports.isDraftable=r,exports.nothing=B,exports.original=function(r){return t(r)||n(23,r),r[H].u},exports.produce=rn,exports.produceWithPatches=en,exports.setAutoFreeze=un,exports.setUseProxies=on;
//# sourceMappingURL=immer.cjs.production.min.js.map

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160814, function(require, module, exports) {


Object.defineProperty(exports, '__esModule', { value: true });

var _ref;

// Should be no imports here!
// Some things that should be evaluated before all else...
// We only want to know if non-polyfilled symbols are available
var hasSymbol = typeof Symbol !== "undefined" && typeof
/*#__PURE__*/
Symbol("x") === "symbol";
var hasMap = typeof Map !== "undefined";
var hasSet = typeof Set !== "undefined";
var hasProxies = typeof Proxy !== "undefined" && typeof Proxy.revocable !== "undefined" && typeof Reflect !== "undefined";
/**
 * The sentinel value returned by producers to replace the draft with undefined.
 */

var NOTHING = hasSymbol ?
/*#__PURE__*/
Symbol.for("immer-nothing") : (_ref = {}, _ref["immer-nothing"] = true, _ref);
/**
 * To let Immer treat your class instances as plain immutable objects
 * (albeit with a custom prototype), you must define either an instance property
 * or a static property on each of your custom classes.
 *
 * Otherwise, your class instance will never be drafted, which means it won't be
 * safe to mutate in a produce callback.
 */

var DRAFTABLE = hasSymbol ?
/*#__PURE__*/
Symbol.for("immer-draftable") : "__$immer_draftable";
var DRAFT_STATE = hasSymbol ?
/*#__PURE__*/
Symbol.for("immer-state") : "__$immer_state"; // Even a polyfilled Symbol might provide Symbol.iterator

var iteratorSymbol = typeof Symbol != "undefined" && Symbol.iterator || "@@iterator";

var errors = {
  0: "Illegal state",
  1: "Immer drafts cannot have computed properties",
  2: "This object has been frozen and should not be mutated",
  3: function _(data) {
    return "Cannot use a proxy that has been revoked. Did you pass an object from inside an immer function to an async process? " + data;
  },
  4: "An immer producer returned a new value *and* modified its draft. Either return a new value *or* modify the draft.",
  5: "Immer forbids circular references",
  6: "The first or second argument to `produce` must be a function",
  7: "The third argument to `produce` must be a function or undefined",
  8: "First argument to `createDraft` must be a plain object, an array, or an immerable object",
  9: "First argument to `finishDraft` must be a draft returned by `createDraft`",
  10: "The given draft is already finalized",
  11: "Object.defineProperty() cannot be used on an Immer draft",
  12: "Object.setPrototypeOf() cannot be used on an Immer draft",
  13: "Immer only supports deleting array indices",
  14: "Immer only supports setting array indices and the 'length' property",
  15: function _(path) {
    return "Cannot apply patch, path doesn't resolve: " + path;
  },
  16: 'Sets cannot have "replace" patches.',
  17: function _(op) {
    return "Unsupported patch operation: " + op;
  },
  18: function _(plugin) {
    return "The plugin for '" + plugin + "' has not been loaded into Immer. To enable the plugin, import and call `enable" + plugin + "()` when initializing your application.";
  },
  20: "Cannot use proxies if Proxy, Proxy.revocable or Reflect are not available",
  21: function _(thing) {
    return "produce can only be called on things that are draftable: plain objects, arrays, Map, Set or classes that are marked with '[immerable]: true'. Got '" + thing + "'";
  },
  22: function _(thing) {
    return "'current' expects a draft, got: " + thing;
  },
  23: function _(thing) {
    return "'original' expects a draft, got: " + thing;
  },
  24: "Patching reserved attributes like __proto__, prototype and constructor is not allowed"
};
function die(error) {
  for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
    args[_key - 1] = arguments[_key];
  }

  {
    var e = errors[error];
    var msg = !e ? "unknown error nr: " + error : typeof e === "function" ? e.apply(null, args) : e;
    throw new Error("[Immer] " + msg);
  }
}

/** Returns true if the given value is an Immer draft */

/*#__PURE__*/

function isDraft(value) {
  return !!value && !!value[DRAFT_STATE];
}
/** Returns true if the given value can be drafted by Immer */

/*#__PURE__*/

function isDraftable(value) {
  if (!value) return false;
  return isPlainObject(value) || Array.isArray(value) || !!value[DRAFTABLE] || !!value.constructor[DRAFTABLE] || isMap(value) || isSet(value);
}
var objectCtorString =
/*#__PURE__*/
Object.prototype.constructor.toString();
/*#__PURE__*/

function isPlainObject(value) {
  if (!value || typeof value !== "object") return false;
  var proto = Object.getPrototypeOf(value);

  if (proto === null) {
    return true;
  }

  var Ctor = Object.hasOwnProperty.call(proto, "constructor") && proto.constructor;
  if (Ctor === Object) return true;
  return typeof Ctor == "function" && Function.toString.call(Ctor) === objectCtorString;
}
function original(value) {
  if (!isDraft(value)) die(23, value);
  return value[DRAFT_STATE].base_;
}
/*#__PURE__*/

var ownKeys = typeof Reflect !== "undefined" && Reflect.ownKeys ? Reflect.ownKeys : typeof Object.getOwnPropertySymbols !== "undefined" ? function (obj) {
  return Object.getOwnPropertyNames(obj).concat(Object.getOwnPropertySymbols(obj));
} :
/* istanbul ignore next */
Object.getOwnPropertyNames;
var getOwnPropertyDescriptors = Object.getOwnPropertyDescriptors || function getOwnPropertyDescriptors(target) {
  // Polyfill needed for Hermes and IE, see https://github.com/facebook/hermes/issues/274
  var res = {};
  ownKeys(target).forEach(function (key) {
    res[key] = Object.getOwnPropertyDescriptor(target, key);
  });
  return res;
};
function each(obj, iter, enumerableOnly) {
  if (enumerableOnly === void 0) {
    enumerableOnly = false;
  }

  if (getArchtype(obj) === 0
  /* Object */
  ) {
      (enumerableOnly ? Object.keys : ownKeys)(obj).forEach(function (key) {
        if (!enumerableOnly || typeof key !== "symbol") iter(key, obj[key], obj);
      });
    } else {
    obj.forEach(function (entry, index) {
      return iter(index, entry, obj);
    });
  }
}
/*#__PURE__*/

function getArchtype(thing) {
  /* istanbul ignore next */
  var state = thing[DRAFT_STATE];
  return state ? state.type_ > 3 ? state.type_ - 4 // cause Object and Array map back from 4 and 5
  : state.type_ // others are the same
  : Array.isArray(thing) ? 1
  /* Array */
  : isMap(thing) ? 2
  /* Map */
  : isSet(thing) ? 3
  /* Set */
  : 0
  /* Object */
  ;
}
/*#__PURE__*/

function has(thing, prop) {
  return getArchtype(thing) === 2
  /* Map */
  ? thing.has(prop) : Object.prototype.hasOwnProperty.call(thing, prop);
}
/*#__PURE__*/

function get(thing, prop) {
  // @ts-ignore
  return getArchtype(thing) === 2
  /* Map */
  ? thing.get(prop) : thing[prop];
}
/*#__PURE__*/

function set(thing, propOrOldValue, value) {
  var t = getArchtype(thing);
  if (t === 2
  /* Map */
  ) thing.set(propOrOldValue, value);else if (t === 3
  /* Set */
  ) {
      thing.delete(propOrOldValue);
      thing.add(value);
    } else thing[propOrOldValue] = value;
}
/*#__PURE__*/

function is(x, y) {
  // From: https://github.com/facebook/fbjs/blob/c69904a511b900266935168223063dd8772dfc40/packages/fbjs/src/core/shallowEqual.js
  if (x === y) {
    return x !== 0 || 1 / x === 1 / y;
  } else {
    return x !== x && y !== y;
  }
}
/*#__PURE__*/

function isMap(target) {
  return hasMap && target instanceof Map;
}
/*#__PURE__*/

function isSet(target) {
  return hasSet && target instanceof Set;
}
/*#__PURE__*/

function latest(state) {
  return state.copy_ || state.base_;
}
/*#__PURE__*/

function shallowCopy(base) {
  if (Array.isArray(base)) return Array.prototype.slice.call(base);
  var descriptors = getOwnPropertyDescriptors(base);
  delete descriptors[DRAFT_STATE];
  var keys = ownKeys(descriptors);

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    var desc = descriptors[key];

    if (desc.writable === false) {
      desc.writable = true;
      desc.configurable = true;
    } // like object.assign, we will read any _own_, get/set accessors. This helps in dealing
    // with libraries that trap values, like mobx or vue
    // unlike object.assign, non-enumerables will be copied as well


    if (desc.get || desc.set) descriptors[key] = {
      configurable: true,
      writable: true,
      enumerable: desc.enumerable,
      value: base[key]
    };
  }

  return Object.create(Object.getPrototypeOf(base), descriptors);
}
function freeze(obj, deep) {
  if (deep === void 0) {
    deep = false;
  }

  if (isFrozen(obj) || isDraft(obj) || !isDraftable(obj)) return obj;

  if (getArchtype(obj) > 1
  /* Map or Set */
  ) {
      obj.set = obj.add = obj.clear = obj.delete = dontMutateFrozenCollections;
    }

  Object.freeze(obj);
  if (deep) each(obj, function (key, value) {
    return freeze(value, true);
  }, true);
  return obj;
}

function dontMutateFrozenCollections() {
  die(2);
}

function isFrozen(obj) {
  if (obj == null || typeof obj !== "object") return true; // See #600, IE dies on non-objects in Object.isFrozen

  return Object.isFrozen(obj);
}

/** Plugin utilities */

var plugins = {};
function getPlugin(pluginKey) {
  var plugin = plugins[pluginKey];

  if (!plugin) {
    die(18, pluginKey);
  } // @ts-ignore


  return plugin;
}
function loadPlugin(pluginKey, implementation) {
  if (!plugins[pluginKey]) plugins[pluginKey] = implementation;
}

var currentScope;
function getCurrentScope() {
  if ( !currentScope) die(0);
  return currentScope;
}

function createScope(parent_, immer_) {
  return {
    drafts_: [],
    parent_: parent_,
    immer_: immer_,
    // Whenever the modified draft contains a draft from another scope, we
    // need to prevent auto-freezing so the unowned draft can be finalized.
    canAutoFreeze_: true,
    unfinalizedDrafts_: 0
  };
}

function usePatchesInScope(scope, patchListener) {
  if (patchListener) {
    getPlugin("Patches"); // assert we have the plugin

    scope.patches_ = [];
    scope.inversePatches_ = [];
    scope.patchListener_ = patchListener;
  }
}
function revokeScope(scope) {
  leaveScope(scope);
  scope.drafts_.forEach(revokeDraft); // @ts-ignore

  scope.drafts_ = null;
}
function leaveScope(scope) {
  if (scope === currentScope) {
    currentScope = scope.parent_;
  }
}
function enterScope(immer) {
  return currentScope = createScope(currentScope, immer);
}

function revokeDraft(draft) {
  var state = draft[DRAFT_STATE];
  if (state.type_ === 0
  /* ProxyObject */
  || state.type_ === 1
  /* ProxyArray */
  ) state.revoke_();else state.revoked_ = true;
}

function processResult(result, scope) {
  scope.unfinalizedDrafts_ = scope.drafts_.length;
  var baseDraft = scope.drafts_[0];
  var isReplaced = result !== undefined && result !== baseDraft;
  if (!scope.immer_.useProxies_) getPlugin("ES5").willFinalizeES5_(scope, result, isReplaced);

  if (isReplaced) {
    if (baseDraft[DRAFT_STATE].modified_) {
      revokeScope(scope);
      die(4);
    }

    if (isDraftable(result)) {
      // Finalize the result in case it contains (or is) a subset of the draft.
      result = finalize(scope, result);
      if (!scope.parent_) maybeFreeze(scope, result);
    }

    if (scope.patches_) {
      getPlugin("Patches").generateReplacementPatches_(baseDraft[DRAFT_STATE].base_, result, scope.patches_, scope.inversePatches_);
    }
  } else {
    // Finalize the base draft.
    result = finalize(scope, baseDraft, []);
  }

  revokeScope(scope);

  if (scope.patches_) {
    scope.patchListener_(scope.patches_, scope.inversePatches_);
  }

  return result !== NOTHING ? result : undefined;
}

function finalize(rootScope, value, path) {
  // Don't recurse in tho recursive data structures
  if (isFrozen(value)) return value;
  var state = value[DRAFT_STATE]; // A plain object, might need freezing, might contain drafts

  if (!state) {
    each(value, function (key, childValue) {
      return finalizeProperty(rootScope, state, value, key, childValue, path);
    }, true // See #590, don't recurse into non-enumerable of non drafted objects
    );
    return value;
  } // Never finalize drafts owned by another scope.


  if (state.scope_ !== rootScope) return value; // Unmodified draft, return the (frozen) original

  if (!state.modified_) {
    maybeFreeze(rootScope, state.base_, true);
    return state.base_;
  } // Not finalized yet, let's do that now


  if (!state.finalized_) {
    state.finalized_ = true;
    state.scope_.unfinalizedDrafts_--;
    var result = // For ES5, create a good copy from the draft first, with added keys and without deleted keys.
    state.type_ === 4
    /* ES5Object */
    || state.type_ === 5
    /* ES5Array */
    ? state.copy_ = shallowCopy(state.draft_) : state.copy_; // Finalize all children of the copy
    // For sets we clone before iterating, otherwise we can get in endless loop due to modifying during iteration, see #628
    // Although the original test case doesn't seem valid anyway, so if this in the way we can turn the next line
    // back to each(result, ....)

    each(state.type_ === 3
    /* Set */
    ? new Set(result) : result, function (key, childValue) {
      return finalizeProperty(rootScope, state, result, key, childValue, path);
    }); // everything inside is frozen, we can freeze here

    maybeFreeze(rootScope, result, false); // first time finalizing, let's create those patches

    if (path && rootScope.patches_) {
      getPlugin("Patches").generatePatches_(state, path, rootScope.patches_, rootScope.inversePatches_);
    }
  }

  return state.copy_;
}

function finalizeProperty(rootScope, parentState, targetObject, prop, childValue, rootPath) {
  if ( childValue === targetObject) die(5);

  if (isDraft(childValue)) {
    var path = rootPath && parentState && parentState.type_ !== 3
    /* Set */
    && // Set objects are atomic since they have no keys.
    !has(parentState.assigned_, prop) // Skip deep patches for assigned keys.
    ? rootPath.concat(prop) : undefined; // Drafts owned by `scope` are finalized here.

    var res = finalize(rootScope, childValue, path);
    set(targetObject, prop, res); // Drafts from another scope must prevented to be frozen
    // if we got a draft back from finalize, we're in a nested produce and shouldn't freeze

    if (isDraft(res)) {
      rootScope.canAutoFreeze_ = false;
    } else return;
  } // Search new objects for unfinalized drafts. Frozen objects should never contain drafts.


  if (isDraftable(childValue) && !isFrozen(childValue)) {
    if (!rootScope.immer_.autoFreeze_ && rootScope.unfinalizedDrafts_ < 1) {
      // optimization: if an object is not a draft, and we don't have to
      // deepfreeze everything, and we are sure that no drafts are left in the remaining object
      // cause we saw and finalized all drafts already; we can stop visiting the rest of the tree.
      // This benefits especially adding large data tree's without further processing.
      // See add-data.js perf test
      return;
    }

    finalize(rootScope, childValue); // immer deep freezes plain objects, so if there is no parent state, we freeze as well

    if (!parentState || !parentState.scope_.parent_) maybeFreeze(rootScope, childValue);
  }
}

function maybeFreeze(scope, value, deep) {
  if (deep === void 0) {
    deep = false;
  }

  if (scope.immer_.autoFreeze_ && scope.canAutoFreeze_) {
    freeze(value, deep);
  }
}

/**
 * Returns a new draft of the `base` object.
 *
 * The second argument is the parent draft-state (used internally).
 */

function createProxyProxy(base, parent) {
  var isArray = Array.isArray(base);
  var state = {
    type_: isArray ? 1
    /* ProxyArray */
    : 0
    /* ProxyObject */
    ,
    // Track which produce call this is associated with.
    scope_: parent ? parent.scope_ : getCurrentScope(),
    // True for both shallow and deep changes.
    modified_: false,
    // Used during finalization.
    finalized_: false,
    // Track which properties have been assigned (true) or deleted (false).
    assigned_: {},
    // The parent draft state.
    parent_: parent,
    // The base state.
    base_: base,
    // The base proxy.
    draft_: null,
    // The base copy with any updated values.
    copy_: null,
    // Called by the `produce` function.
    revoke_: null,
    isManual_: false
  }; // the traps must target something, a bit like the 'real' base.
  // but also, we need to be able to determine from the target what the relevant state is
  // (to avoid creating traps per instance to capture the state in closure,
  // and to avoid creating weird hidden properties as well)
  // So the trick is to use 'state' as the actual 'target'! (and make sure we intercept everything)
  // Note that in the case of an array, we put the state in an array to have better Reflect defaults ootb

  var target = state;
  var traps = objectTraps;

  if (isArray) {
    target = [state];
    traps = arrayTraps;
  }

  var _Proxy$revocable = Proxy.revocable(target, traps),
      revoke = _Proxy$revocable.revoke,
      proxy = _Proxy$revocable.proxy;

  state.draft_ = proxy;
  state.revoke_ = revoke;
  return proxy;
}
/**
 * Object drafts
 */

var objectTraps = {
  get: function get(state, prop) {
    if (prop === DRAFT_STATE) return state;
    var source = latest(state);

    if (!has(source, prop)) {
      // non-existing or non-own property...
      return readPropFromProto(state, source, prop);
    }

    var value = source[prop];

    if (state.finalized_ || !isDraftable(value)) {
      return value;
    } // Check for existing draft in modified state.
    // Assigned values are never drafted. This catches any drafts we created, too.


    if (value === peek(state.base_, prop)) {
      prepareCopy(state);
      return state.copy_[prop] = createProxy(state.scope_.immer_, value, state);
    }

    return value;
  },
  has: function has(state, prop) {
    return prop in latest(state);
  },
  ownKeys: function ownKeys(state) {
    return Reflect.ownKeys(latest(state));
  },
  set: function set(state, prop
  /* strictly not, but helps TS */
  , value) {
    var desc = getDescriptorFromProto(latest(state), prop);

    if (desc === null || desc === void 0 ? void 0 : desc.set) {
      // special case: if this write is captured by a setter, we have
      // to trigger it with the correct context
      desc.set.call(state.draft_, value);
      return true;
    }

    if (!state.modified_) {
      // the last check is because we need to be able to distinguish setting a non-existing to undefined (which is a change)
      // from setting an existing property with value undefined to undefined (which is not a change)
      var current = peek(latest(state), prop); // special case, if we assigning the original value to a draft, we can ignore the assignment

      var currentState = current === null || current === void 0 ? void 0 : current[DRAFT_STATE];

      if (currentState && currentState.base_ === value) {
        state.copy_[prop] = value;
        state.assigned_[prop] = false;
        return true;
      }

      if (is(value, current) && (value !== undefined || has(state.base_, prop))) return true;
      prepareCopy(state);
      markChanged(state);
    }

    if (state.copy_[prop] === value && // special case: NaN
    typeof value !== "number" && ( // special case: handle new props with value 'undefined'
    value !== undefined || prop in state.copy_)) return true; // @ts-ignore

    state.copy_[prop] = value;
    state.assigned_[prop] = true;
    return true;
  },
  deleteProperty: function deleteProperty(state, prop) {
    // The `undefined` check is a fast path for pre-existing keys.
    if (peek(state.base_, prop) !== undefined || prop in state.base_) {
      state.assigned_[prop] = false;
      prepareCopy(state);
      markChanged(state);
    } else {
      // if an originally not assigned property was deleted
      delete state.assigned_[prop];
    } // @ts-ignore


    if (state.copy_) delete state.copy_[prop];
    return true;
  },
  // Note: We never coerce `desc.value` into an Immer draft, because we can't make
  // the same guarantee in ES5 mode.
  getOwnPropertyDescriptor: function getOwnPropertyDescriptor(state, prop) {
    var owner = latest(state);
    var desc = Reflect.getOwnPropertyDescriptor(owner, prop);
    if (!desc) return desc;
    return {
      writable: true,
      configurable: state.type_ !== 1
      /* ProxyArray */
      || prop !== "length",
      enumerable: desc.enumerable,
      value: owner[prop]
    };
  },
  defineProperty: function defineProperty() {
    die(11);
  },
  getPrototypeOf: function getPrototypeOf(state) {
    return Object.getPrototypeOf(state.base_);
  },
  setPrototypeOf: function setPrototypeOf() {
    die(12);
  }
};
/**
 * Array drafts
 */

var arrayTraps = {};
each(objectTraps, function (key, fn) {
  // @ts-ignore
  arrayTraps[key] = function () {
    arguments[0] = arguments[0][0];
    return fn.apply(this, arguments);
  };
});

arrayTraps.deleteProperty = function (state, prop) {
  if ( isNaN(parseInt(prop))) die(13); // @ts-ignore

  return arrayTraps.set.call(this, state, prop, undefined);
};

arrayTraps.set = function (state, prop, value) {
  if ( prop !== "length" && isNaN(parseInt(prop))) die(14);
  return objectTraps.set.call(this, state[0], prop, value, state[0]);
}; // Access a property without creating an Immer draft.


function peek(draft, prop) {
  var state = draft[DRAFT_STATE];
  var source = state ? latest(state) : draft;
  return source[prop];
}

function readPropFromProto(state, source, prop) {
  var _desc$get;

  var desc = getDescriptorFromProto(source, prop);
  return desc ? "value" in desc ? desc.value : // This is a very special case, if the prop is a getter defined by the
  // prototype, we should invoke it with the draft as context!
  (_desc$get = desc.get) === null || _desc$get === void 0 ? void 0 : _desc$get.call(state.draft_) : undefined;
}

function getDescriptorFromProto(source, prop) {
  // 'in' checks proto!
  if (!(prop in source)) return undefined;
  var proto = Object.getPrototypeOf(source);

  while (proto) {
    var desc = Object.getOwnPropertyDescriptor(proto, prop);
    if (desc) return desc;
    proto = Object.getPrototypeOf(proto);
  }

  return undefined;
}

function markChanged(state) {
  if (!state.modified_) {
    state.modified_ = true;

    if (state.parent_) {
      markChanged(state.parent_);
    }
  }
}
function prepareCopy(state) {
  if (!state.copy_) {
    state.copy_ = shallowCopy(state.base_);
  }
}

var Immer =
/*#__PURE__*/
function () {
  function Immer(config) {
    var _this = this;

    this.useProxies_ = hasProxies;
    this.autoFreeze_ = true;
    /**
     * The `produce` function takes a value and a "recipe function" (whose
     * return value often depends on the base state). The recipe function is
     * free to mutate its first argument however it wants. All mutations are
     * only ever applied to a __copy__ of the base state.
     *
     * Pass only a function to create a "curried producer" which relieves you
     * from passing the recipe function every time.
     *
     * Only plain objects and arrays are made mutable. All other objects are
     * considered uncopyable.
     *
     * Note: This function is __bound__ to its `Immer` instance.
     *
     * @param {any} base - the initial state
     * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
     * @param {Function} patchListener - optional function that will be called with all the patches produced here
     * @returns {any} a new state, or the initial state if nothing was modified
     */

    this.produce = function (base, recipe, patchListener) {
      // curried invocation
      if (typeof base === "function" && typeof recipe !== "function") {
        var defaultBase = recipe;
        recipe = base;
        var self = _this;
        return function curriedProduce(base) {
          var _this2 = this;

          if (base === void 0) {
            base = defaultBase;
          }

          for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
            args[_key - 1] = arguments[_key];
          }

          return self.produce(base, function (draft) {
            var _recipe;

            return (_recipe = recipe).call.apply(_recipe, [_this2, draft].concat(args));
          }); // prettier-ignore
        };
      }

      if (typeof recipe !== "function") die(6);
      if (patchListener !== undefined && typeof patchListener !== "function") die(7);
      var result; // Only plain objects, arrays, and "immerable classes" are drafted.

      if (isDraftable(base)) {
        var scope = enterScope(_this);
        var proxy = createProxy(_this, base, undefined);
        var hasError = true;

        try {
          result = recipe(proxy);
          hasError = false;
        } finally {
          // finally instead of catch + rethrow better preserves original stack
          if (hasError) revokeScope(scope);else leaveScope(scope);
        }

        if (typeof Promise !== "undefined" && result instanceof Promise) {
          return result.then(function (result) {
            usePatchesInScope(scope, patchListener);
            return processResult(result, scope);
          }, function (error) {
            revokeScope(scope);
            throw error;
          });
        }

        usePatchesInScope(scope, patchListener);
        return processResult(result, scope);
      } else if (!base || typeof base !== "object") {
        result = recipe(base);
        if (result === undefined) result = base;
        if (result === NOTHING) result = undefined;
        if (_this.autoFreeze_) freeze(result, true);

        if (patchListener) {
          var p = [];
          var ip = [];
          getPlugin("Patches").generateReplacementPatches_(base, result, p, ip);
          patchListener(p, ip);
        }

        return result;
      } else die(21, base);
    };

    this.produceWithPatches = function (arg1, arg2, arg3) {
      if (typeof arg1 === "function") {
        return function (state) {
          for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
            args[_key2 - 1] = arguments[_key2];
          }

          return _this.produceWithPatches(state, function (draft) {
            return arg1.apply(void 0, [draft].concat(args));
          });
        };
      }

      var patches, inversePatches;

      var result = _this.produce(arg1, arg2, function (p, ip) {
        patches = p;
        inversePatches = ip;
      });

      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then(function (nextState) {
          return [nextState, patches, inversePatches];
        });
      }

      return [result, patches, inversePatches];
    };

    if (typeof (config === null || config === void 0 ? void 0 : config.useProxies) === "boolean") this.setUseProxies(config.useProxies);
    if (typeof (config === null || config === void 0 ? void 0 : config.autoFreeze) === "boolean") this.setAutoFreeze(config.autoFreeze);
  }

  var _proto = Immer.prototype;

  _proto.createDraft = function createDraft(base) {
    if (!isDraftable(base)) die(8);
    if (isDraft(base)) base = current(base);
    var scope = enterScope(this);
    var proxy = createProxy(this, base, undefined);
    proxy[DRAFT_STATE].isManual_ = true;
    leaveScope(scope);
    return proxy;
  };

  _proto.finishDraft = function finishDraft(draft, patchListener) {
    var state = draft && draft[DRAFT_STATE];

    {
      if (!state || !state.isManual_) die(9);
      if (state.finalized_) die(10);
    }

    var scope = state.scope_;
    usePatchesInScope(scope, patchListener);
    return processResult(undefined, scope);
  }
  /**
   * Pass true to automatically freeze all copies created by Immer.
   *
   * By default, auto-freezing is enabled.
   */
  ;

  _proto.setAutoFreeze = function setAutoFreeze(value) {
    this.autoFreeze_ = value;
  }
  /**
   * Pass true to use the ES2015 `Proxy` class when creating drafts, which is
   * always faster than using ES5 proxies.
   *
   * By default, feature detection is used, so calling this is rarely necessary.
   */
  ;

  _proto.setUseProxies = function setUseProxies(value) {
    if (value && !hasProxies) {
      die(20);
    }

    this.useProxies_ = value;
  };

  _proto.applyPatches = function applyPatches(base, patches) {
    // If a patch replaces the entire state, take that replacement as base
    // before applying patches
    var i;

    for (i = patches.length - 1; i >= 0; i--) {
      var patch = patches[i];

      if (patch.path.length === 0 && patch.op === "replace") {
        base = patch.value;
        break;
      }
    } // If there was a patch that replaced the entire state, start from the
    // patch after that.


    if (i > -1) {
      patches = patches.slice(i + 1);
    }

    var applyPatchesImpl = getPlugin("Patches").applyPatches_;

    if (isDraft(base)) {
      // N.B: never hits if some patch a replacement, patches are never drafts
      return applyPatchesImpl(base, patches);
    } // Otherwise, produce a copy of the base state.


    return this.produce(base, function (draft) {
      return applyPatchesImpl(draft, patches);
    });
  };

  return Immer;
}();
function createProxy(immer, value, parent) {
  // precondition: createProxy should be guarded by isDraftable, so we know we can safely draft
  var draft = isMap(value) ? getPlugin("MapSet").proxyMap_(value, parent) : isSet(value) ? getPlugin("MapSet").proxySet_(value, parent) : immer.useProxies_ ? createProxyProxy(value, parent) : getPlugin("ES5").createES5Proxy_(value, parent);
  var scope = parent ? parent.scope_ : getCurrentScope();
  scope.drafts_.push(draft);
  return draft;
}

function current(value) {
  if (!isDraft(value)) die(22, value);
  return currentImpl(value);
}

function currentImpl(value) {
  if (!isDraftable(value)) return value;
  var state = value[DRAFT_STATE];
  var copy;
  var archType = getArchtype(value);

  if (state) {
    if (!state.modified_ && (state.type_ < 4 || !getPlugin("ES5").hasChanges_(state))) return state.base_; // Optimization: avoid generating new drafts during copying

    state.finalized_ = true;
    copy = copyHelper(value, archType);
    state.finalized_ = false;
  } else {
    copy = copyHelper(value, archType);
  }

  each(copy, function (key, childValue) {
    if (state && get(state.base_, key) === childValue) return; // no need to copy or search in something that didn't change

    set(copy, key, currentImpl(childValue));
  }); // In the future, we might consider freezing here, based on the current settings

  return archType === 3
  /* Set */
  ? new Set(copy) : copy;
}

function copyHelper(value, archType) {
  // creates a shallow copy, even if it is a map or set
  switch (archType) {
    case 2
    /* Map */
    :
      return new Map(value);

    case 3
    /* Set */
    :
      // Set will be cloned as array temporarily, so that we can replace individual items
      return Array.from(value);
  }

  return shallowCopy(value);
}

function enableES5() {
  function willFinalizeES5_(scope, result, isReplaced) {
    if (!isReplaced) {
      if (scope.patches_) {
        markChangesRecursively(scope.drafts_[0]);
      } // This is faster when we don't care about which attributes changed.


      markChangesSweep(scope.drafts_);
    } // When a child draft is returned, look for changes.
    else if (isDraft(result) && result[DRAFT_STATE].scope_ === scope) {
        markChangesSweep(scope.drafts_);
      }
  }

  function createES5Draft(isArray, base) {
    if (isArray) {
      var draft = new Array(base.length);

      for (var i = 0; i < base.length; i++) {
        Object.defineProperty(draft, "" + i, proxyProperty(i, true));
      }

      return draft;
    } else {
      var _descriptors = getOwnPropertyDescriptors(base);

      delete _descriptors[DRAFT_STATE];
      var keys = ownKeys(_descriptors);

      for (var _i = 0; _i < keys.length; _i++) {
        var key = keys[_i];
        _descriptors[key] = proxyProperty(key, isArray || !!_descriptors[key].enumerable);
      }

      return Object.create(Object.getPrototypeOf(base), _descriptors);
    }
  }

  function createES5Proxy_(base, parent) {
    var isArray = Array.isArray(base);
    var draft = createES5Draft(isArray, base);
    var state = {
      type_: isArray ? 5
      /* ES5Array */
      : 4
      /* ES5Object */
      ,
      scope_: parent ? parent.scope_ : getCurrentScope(),
      modified_: false,
      finalized_: false,
      assigned_: {},
      parent_: parent,
      // base is the object we are drafting
      base_: base,
      // draft is the draft object itself, that traps all reads and reads from either the base (if unmodified) or copy (if modified)
      draft_: draft,
      copy_: null,
      revoked_: false,
      isManual_: false
    };
    Object.defineProperty(draft, DRAFT_STATE, {
      value: state,
      // enumerable: false <- the default
      writable: true
    });
    return draft;
  } // property descriptors are recycled to make sure we don't create a get and set closure per property,
  // but share them all instead


  var descriptors = {};

  function proxyProperty(prop, enumerable) {
    var desc = descriptors[prop];

    if (desc) {
      desc.enumerable = enumerable;
    } else {
      descriptors[prop] = desc = {
        configurable: true,
        enumerable: enumerable,
        get: function get() {
          var state = this[DRAFT_STATE];
          assertUnrevoked(state); // @ts-ignore

          return objectTraps.get(state, prop);
        },
        set: function set(value) {
          var state = this[DRAFT_STATE];
          assertUnrevoked(state); // @ts-ignore

          objectTraps.set(state, prop, value);
        }
      };
    }

    return desc;
  } // This looks expensive, but only proxies are visited, and only objects without known changes are scanned.


  function markChangesSweep(drafts) {
    // The natural order of drafts in the `scope` array is based on when they
    // were accessed. By processing drafts in reverse natural order, we have a
    // better chance of processing leaf nodes first. When a leaf node is known to
    // have changed, we can avoid any traversal of its ancestor nodes.
    for (var i = drafts.length - 1; i >= 0; i--) {
      var state = drafts[i][DRAFT_STATE];

      if (!state.modified_) {
        switch (state.type_) {
          case 5
          /* ES5Array */
          :
            if (hasArrayChanges(state)) markChanged(state);
            break;

          case 4
          /* ES5Object */
          :
            if (hasObjectChanges(state)) markChanged(state);
            break;
        }
      }
    }
  }

  function markChangesRecursively(object) {
    if (!object || typeof object !== "object") return;
    var state = object[DRAFT_STATE];
    if (!state) return;
    var base_ = state.base_,
        draft_ = state.draft_,
        assigned_ = state.assigned_,
        type_ = state.type_;

    if (type_ === 4
    /* ES5Object */
    ) {
        // Look for added keys.
        // probably there is a faster way to detect changes, as sweep + recurse seems to do some
        // unnecessary work.
        // also: probably we can store the information we detect here, to speed up tree finalization!
        each(draft_, function (key) {
          if (key === DRAFT_STATE) return; // The `undefined` check is a fast path for pre-existing keys.

          if (base_[key] === undefined && !has(base_, key)) {
            assigned_[key] = true;
            markChanged(state);
          } else if (!assigned_[key]) {
            // Only untouched properties trigger recursion.
            markChangesRecursively(draft_[key]);
          }
        }); // Look for removed keys.

        each(base_, function (key) {
          // The `undefined` check is a fast path for pre-existing keys.
          if (draft_[key] === undefined && !has(draft_, key)) {
            assigned_[key] = false;
            markChanged(state);
          }
        });
      } else if (type_ === 5
    /* ES5Array */
    ) {
        if (hasArrayChanges(state)) {
          markChanged(state);
          assigned_.length = true;
        }

        if (draft_.length < base_.length) {
          for (var i = draft_.length; i < base_.length; i++) {
            assigned_[i] = false;
          }
        } else {
          for (var _i2 = base_.length; _i2 < draft_.length; _i2++) {
            assigned_[_i2] = true;
          }
        } // Minimum count is enough, the other parts has been processed.


        var min = Math.min(draft_.length, base_.length);

        for (var _i3 = 0; _i3 < min; _i3++) {
          // Only untouched indices trigger recursion.
          if (!draft_.hasOwnProperty(_i3)) {
            assigned_[_i3] = true;
          }

          if (assigned_[_i3] === undefined) markChangesRecursively(draft_[_i3]);
        }
      }
  }

  function hasObjectChanges(state) {
    var base_ = state.base_,
        draft_ = state.draft_; // Search for added keys and changed keys. Start at the back, because
    // non-numeric keys are ordered by time of definition on the object.

    var keys = ownKeys(draft_);

    for (var i = keys.length - 1; i >= 0; i--) {
      var key = keys[i];
      if (key === DRAFT_STATE) continue;
      var baseValue = base_[key]; // The `undefined` check is a fast path for pre-existing keys.

      if (baseValue === undefined && !has(base_, key)) {
        return true;
      } // Once a base key is deleted, future changes go undetected, because its
      // descriptor is erased. This branch detects any missed changes.
      else {
          var value = draft_[key];

          var _state = value && value[DRAFT_STATE];

          if (_state ? _state.base_ !== baseValue : !is(value, baseValue)) {
            return true;
          }
        }
    } // At this point, no keys were added or changed.
    // Compare key count to determine if keys were deleted.


    var baseIsDraft = !!base_[DRAFT_STATE];
    return keys.length !== ownKeys(base_).length + (baseIsDraft ? 0 : 1); // + 1 to correct for DRAFT_STATE
  }

  function hasArrayChanges(state) {
    var draft_ = state.draft_;
    if (draft_.length !== state.base_.length) return true; // See #116
    // If we first shorten the length, our array interceptors will be removed.
    // If after that new items are added, result in the same original length,
    // those last items will have no intercepting property.
    // So if there is no own descriptor on the last position, we know that items were removed and added
    // N.B.: splice, unshift, etc only shift values around, but not prop descriptors, so we only have to check
    // the last one
    // last descriptor can be not a trap, if the array was extended

    var descriptor = Object.getOwnPropertyDescriptor(draft_, draft_.length - 1); // descriptor can be null, but only for newly created sparse arrays, eg. new Array(10)

    if (descriptor && !descriptor.get) return true; // if we miss a property, it has been deleted, so array probobaly changed

    for (var i = 0; i < draft_.length; i++) {
      if (!draft_.hasOwnProperty(i)) return true;
    } // For all other cases, we don't have to compare, as they would have been picked up by the index setters


    return false;
  }

  function hasChanges_(state) {
    return state.type_ === 4
    /* ES5Object */
    ? hasObjectChanges(state) : hasArrayChanges(state);
  }

  function assertUnrevoked(state
  /*ES5State | MapState | SetState*/
  ) {
    if (state.revoked_) die(3, JSON.stringify(latest(state)));
  }

  loadPlugin("ES5", {
    createES5Proxy_: createES5Proxy_,
    willFinalizeES5_: willFinalizeES5_,
    hasChanges_: hasChanges_
  });
}

function enablePatches() {
  var REPLACE = "replace";
  var ADD = "add";
  var REMOVE = "remove";

  function generatePatches_(state, basePath, patches, inversePatches) {
    switch (state.type_) {
      case 0
      /* ProxyObject */
      :
      case 4
      /* ES5Object */
      :
      case 2
      /* Map */
      :
        return generatePatchesFromAssigned(state, basePath, patches, inversePatches);

      case 5
      /* ES5Array */
      :
      case 1
      /* ProxyArray */
      :
        return generateArrayPatches(state, basePath, patches, inversePatches);

      case 3
      /* Set */
      :
        return generateSetPatches(state, basePath, patches, inversePatches);
    }
  }

  function generateArrayPatches(state, basePath, patches, inversePatches) {
    var base_ = state.base_,
        assigned_ = state.assigned_;
    var copy_ = state.copy_; // Reduce complexity by ensuring `base` is never longer.

    if (copy_.length < base_.length) {
      var _ref = [copy_, base_];
      base_ = _ref[0];
      copy_ = _ref[1];
      var _ref2 = [inversePatches, patches];
      patches = _ref2[0];
      inversePatches = _ref2[1];
    } // Process replaced indices.


    for (var i = 0; i < base_.length; i++) {
      if (assigned_[i] && copy_[i] !== base_[i]) {
        var path = basePath.concat([i]);
        patches.push({
          op: REPLACE,
          path: path,
          // Need to maybe clone it, as it can in fact be the original value
          // due to the base/copy inversion at the start of this function
          value: clonePatchValueIfNeeded(copy_[i])
        });
        inversePatches.push({
          op: REPLACE,
          path: path,
          value: clonePatchValueIfNeeded(base_[i])
        });
      }
    } // Process added indices.


    for (var _i = base_.length; _i < copy_.length; _i++) {
      var _path = basePath.concat([_i]);

      patches.push({
        op: ADD,
        path: _path,
        // Need to maybe clone it, as it can in fact be the original value
        // due to the base/copy inversion at the start of this function
        value: clonePatchValueIfNeeded(copy_[_i])
      });
    }

    if (base_.length < copy_.length) {
      inversePatches.push({
        op: REPLACE,
        path: basePath.concat(["length"]),
        value: base_.length
      });
    }
  } // This is used for both Map objects and normal objects.


  function generatePatchesFromAssigned(state, basePath, patches, inversePatches) {
    var base_ = state.base_,
        copy_ = state.copy_;
    each(state.assigned_, function (key, assignedValue) {
      var origValue = get(base_, key);
      var value = get(copy_, key);
      var op = !assignedValue ? REMOVE : has(base_, key) ? REPLACE : ADD;
      if (origValue === value && op === REPLACE) return;
      var path = basePath.concat(key);
      patches.push(op === REMOVE ? {
        op: op,
        path: path
      } : {
        op: op,
        path: path,
        value: value
      });
      inversePatches.push(op === ADD ? {
        op: REMOVE,
        path: path
      } : op === REMOVE ? {
        op: ADD,
        path: path,
        value: clonePatchValueIfNeeded(origValue)
      } : {
        op: REPLACE,
        path: path,
        value: clonePatchValueIfNeeded(origValue)
      });
    });
  }

  function generateSetPatches(state, basePath, patches, inversePatches) {
    var base_ = state.base_,
        copy_ = state.copy_;
    var i = 0;
    base_.forEach(function (value) {
      if (!copy_.has(value)) {
        var path = basePath.concat([i]);
        patches.push({
          op: REMOVE,
          path: path,
          value: value
        });
        inversePatches.unshift({
          op: ADD,
          path: path,
          value: value
        });
      }

      i++;
    });
    i = 0;
    copy_.forEach(function (value) {
      if (!base_.has(value)) {
        var path = basePath.concat([i]);
        patches.push({
          op: ADD,
          path: path,
          value: value
        });
        inversePatches.unshift({
          op: REMOVE,
          path: path,
          value: value
        });
      }

      i++;
    });
  }

  function generateReplacementPatches_(baseValue, replacement, patches, inversePatches) {
    patches.push({
      op: REPLACE,
      path: [],
      value: replacement === NOTHING ? undefined : replacement
    });
    inversePatches.push({
      op: REPLACE,
      path: [],
      value: baseValue
    });
  }

  function applyPatches_(draft, patches) {
    patches.forEach(function (patch) {
      var path = patch.path,
          op = patch.op;
      var base = draft;

      for (var i = 0; i < path.length - 1; i++) {
        var parentType = getArchtype(base);
        var p = "" + path[i]; // See #738, avoid prototype pollution

        if ((parentType === 0
        /* Object */
        || parentType === 1
        /* Array */
        ) && (p === "__proto__" || p === "constructor")) die(24);
        if (typeof base === "function" && p === "prototype") die(24);
        base = get(base, p);
        if (typeof base !== "object") die(15, path.join("/"));
      }

      var type = getArchtype(base);
      var value = deepClonePatchValue(patch.value); // used to clone patch to ensure original patch is not modified, see #411

      var key = path[path.length - 1];

      switch (op) {
        case REPLACE:
          switch (type) {
            case 2
            /* Map */
            :
              return base.set(key, value);

            /* istanbul ignore next */

            case 3
            /* Set */
            :
              die(16);

            default:
              // if value is an object, then it's assigned by reference
              // in the following add or remove ops, the value field inside the patch will also be modifyed
              // so we use value from the cloned patch
              // @ts-ignore
              return base[key] = value;
          }

        case ADD:
          switch (type) {
            case 1
            /* Array */
            :
              return key === "-" ? base.push(value) : base.splice(key, 0, value);

            case 2
            /* Map */
            :
              return base.set(key, value);

            case 3
            /* Set */
            :
              return base.add(value);

            default:
              return base[key] = value;
          }

        case REMOVE:
          switch (type) {
            case 1
            /* Array */
            :
              return base.splice(key, 1);

            case 2
            /* Map */
            :
              return base.delete(key);

            case 3
            /* Set */
            :
              return base.delete(patch.value);

            default:
              return delete base[key];
          }

        default:
          die(17, op);
      }
    });
    return draft;
  }

  function deepClonePatchValue(obj) {
    if (!isDraftable(obj)) return obj;
    if (Array.isArray(obj)) return obj.map(deepClonePatchValue);
    if (isMap(obj)) return new Map(Array.from(obj.entries()).map(function (_ref3) {
      var k = _ref3[0],
          v = _ref3[1];
      return [k, deepClonePatchValue(v)];
    }));
    if (isSet(obj)) return new Set(Array.from(obj).map(deepClonePatchValue));
    var cloned = Object.create(Object.getPrototypeOf(obj));

    for (var key in obj) {
      cloned[key] = deepClonePatchValue(obj[key]);
    }

    if (has(obj, DRAFTABLE)) cloned[DRAFTABLE] = obj[DRAFTABLE];
    return cloned;
  }

  function clonePatchValueIfNeeded(obj) {
    if (isDraft(obj)) {
      return deepClonePatchValue(obj);
    } else return obj;
  }

  loadPlugin("Patches", {
    applyPatches_: applyPatches_,
    generatePatches_: generatePatches_,
    generateReplacementPatches_: generateReplacementPatches_
  });
}

// types only!
function enableMapSet() {
  /* istanbul ignore next */
  var _extendStatics = function extendStatics(d, b) {
    _extendStatics = Object.setPrototypeOf || {
      __proto__: []
    } instanceof Array && function (d, b) {
      d.__proto__ = b;
    } || function (d, b) {
      for (var p in b) {
        if (b.hasOwnProperty(p)) d[p] = b[p];
      }
    };

    return _extendStatics(d, b);
  }; // Ugly hack to resolve #502 and inherit built in Map / Set


  function __extends(d, b) {
    _extendStatics(d, b);

    function __() {
      this.constructor = d;
    }

    d.prototype = ( // @ts-ignore
    __.prototype = b.prototype, new __());
  }

  var DraftMap = function (_super) {
    __extends(DraftMap, _super); // Create class manually, cause #502


    function DraftMap(target, parent) {
      this[DRAFT_STATE] = {
        type_: 2
        /* Map */
        ,
        parent_: parent,
        scope_: parent ? parent.scope_ : getCurrentScope(),
        modified_: false,
        finalized_: false,
        copy_: undefined,
        assigned_: undefined,
        base_: target,
        draft_: this,
        isManual_: false,
        revoked_: false
      };
      return this;
    }

    var p = DraftMap.prototype;
    Object.defineProperty(p, "size", {
      get: function get() {
        return latest(this[DRAFT_STATE]).size;
      } // enumerable: false,
      // configurable: true

    });

    p.has = function (key) {
      return latest(this[DRAFT_STATE]).has(key);
    };

    p.set = function (key, value) {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);

      if (!latest(state).has(key) || latest(state).get(key) !== value) {
        prepareMapCopy(state);
        markChanged(state);
        state.assigned_.set(key, true);
        state.copy_.set(key, value);
        state.assigned_.set(key, true);
      }

      return this;
    };

    p.delete = function (key) {
      if (!this.has(key)) {
        return false;
      }

      var state = this[DRAFT_STATE];
      assertUnrevoked(state);
      prepareMapCopy(state);
      markChanged(state);

      if (state.base_.has(key)) {
        state.assigned_.set(key, false);
      } else {
        state.assigned_.delete(key);
      }

      state.copy_.delete(key);
      return true;
    };

    p.clear = function () {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);

      if (latest(state).size) {
        prepareMapCopy(state);
        markChanged(state);
        state.assigned_ = new Map();
        each(state.base_, function (key) {
          state.assigned_.set(key, false);
        });
        state.copy_.clear();
      }
    };

    p.forEach = function (cb, thisArg) {
      var _this = this;

      var state = this[DRAFT_STATE];
      latest(state).forEach(function (_value, key, _map) {
        cb.call(thisArg, _this.get(key), key, _this);
      });
    };

    p.get = function (key) {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);
      var value = latest(state).get(key);

      if (state.finalized_ || !isDraftable(value)) {
        return value;
      }

      if (value !== state.base_.get(key)) {
        return value; // either already drafted or reassigned
      } // despite what it looks, this creates a draft only once, see above condition


      var draft = createProxy(state.scope_.immer_, value, state);
      prepareMapCopy(state);
      state.copy_.set(key, draft);
      return draft;
    };

    p.keys = function () {
      return latest(this[DRAFT_STATE]).keys();
    };

    p.values = function () {
      var _this2 = this,
          _ref;

      var iterator = this.keys();
      return _ref = {}, _ref[iteratorSymbol] = function () {
        return _this2.values();
      }, _ref.next = function next() {
        var r = iterator.next();
        /* istanbul ignore next */

        if (r.done) return r;

        var value = _this2.get(r.value);

        return {
          done: false,
          value: value
        };
      }, _ref;
    };

    p.entries = function () {
      var _this3 = this,
          _ref2;

      var iterator = this.keys();
      return _ref2 = {}, _ref2[iteratorSymbol] = function () {
        return _this3.entries();
      }, _ref2.next = function next() {
        var r = iterator.next();
        /* istanbul ignore next */

        if (r.done) return r;

        var value = _this3.get(r.value);

        return {
          done: false,
          value: [r.value, value]
        };
      }, _ref2;
    };

    p[iteratorSymbol] = function () {
      return this.entries();
    };

    return DraftMap;
  }(Map);

  function proxyMap_(target, parent) {
    // @ts-ignore
    return new DraftMap(target, parent);
  }

  function prepareMapCopy(state) {
    if (!state.copy_) {
      state.assigned_ = new Map();
      state.copy_ = new Map(state.base_);
    }
  }

  var DraftSet = function (_super) {
    __extends(DraftSet, _super); // Create class manually, cause #502


    function DraftSet(target, parent) {
      this[DRAFT_STATE] = {
        type_: 3
        /* Set */
        ,
        parent_: parent,
        scope_: parent ? parent.scope_ : getCurrentScope(),
        modified_: false,
        finalized_: false,
        copy_: undefined,
        base_: target,
        draft_: this,
        drafts_: new Map(),
        revoked_: false,
        isManual_: false
      };
      return this;
    }

    var p = DraftSet.prototype;
    Object.defineProperty(p, "size", {
      get: function get() {
        return latest(this[DRAFT_STATE]).size;
      } // enumerable: true,

    });

    p.has = function (value) {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state); // bit of trickery here, to be able to recognize both the value, and the draft of its value

      if (!state.copy_) {
        return state.base_.has(value);
      }

      if (state.copy_.has(value)) return true;
      if (state.drafts_.has(value) && state.copy_.has(state.drafts_.get(value))) return true;
      return false;
    };

    p.add = function (value) {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);

      if (!this.has(value)) {
        prepareSetCopy(state);
        markChanged(state);
        state.copy_.add(value);
      }

      return this;
    };

    p.delete = function (value) {
      if (!this.has(value)) {
        return false;
      }

      var state = this[DRAFT_STATE];
      assertUnrevoked(state);
      prepareSetCopy(state);
      markChanged(state);
      return state.copy_.delete(value) || (state.drafts_.has(value) ? state.copy_.delete(state.drafts_.get(value)) :
      /* istanbul ignore next */
      false);
    };

    p.clear = function () {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);

      if (latest(state).size) {
        prepareSetCopy(state);
        markChanged(state);
        state.copy_.clear();
      }
    };

    p.values = function () {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);
      prepareSetCopy(state);
      return state.copy_.values();
    };

    p.entries = function entries() {
      var state = this[DRAFT_STATE];
      assertUnrevoked(state);
      prepareSetCopy(state);
      return state.copy_.entries();
    };

    p.keys = function () {
      return this.values();
    };

    p[iteratorSymbol] = function () {
      return this.values();
    };

    p.forEach = function forEach(cb, thisArg) {
      var iterator = this.values();
      var result = iterator.next();

      while (!result.done) {
        cb.call(thisArg, result.value, result.value, this);
        result = iterator.next();
      }
    };

    return DraftSet;
  }(Set);

  function proxySet_(target, parent) {
    // @ts-ignore
    return new DraftSet(target, parent);
  }

  function prepareSetCopy(state) {
    if (!state.copy_) {
      // create drafts for all entries to preserve insertion order
      state.copy_ = new Set();
      state.base_.forEach(function (value) {
        if (isDraftable(value)) {
          var draft = createProxy(state.scope_.immer_, value, state);
          state.drafts_.set(value, draft);
          state.copy_.add(draft);
        } else {
          state.copy_.add(value);
        }
      });
    }
  }

  function assertUnrevoked(state
  /*ES5State | MapState | SetState*/
  ) {
    if (state.revoked_) die(3, JSON.stringify(latest(state)));
  }

  loadPlugin("MapSet", {
    proxyMap_: proxyMap_,
    proxySet_: proxySet_
  });
}

function enableAllPlugins() {
  enableES5();
  enableMapSet();
  enablePatches();
}

var immer =
/*#__PURE__*/
new Immer();
/**
 * The `produce` function takes a value and a "recipe function" (whose
 * return value often depends on the base state). The recipe function is
 * free to mutate its first argument however it wants. All mutations are
 * only ever applied to a __copy__ of the base state.
 *
 * Pass only a function to create a "curried producer" which relieves you
 * from passing the recipe function every time.
 *
 * Only plain objects and arrays are made mutable. All other objects are
 * considered uncopyable.
 *
 * Note: This function is __bound__ to its `Immer` instance.
 *
 * @param {any} base - the initial state
 * @param {Function} producer - function that receives a proxy of the base state as first argument and which can be freely modified
 * @param {Function} patchListener - optional function that will be called with all the patches produced here
 * @returns {any} a new state, or the initial state if nothing was modified
 */

var produce = immer.produce;
/**
 * Like `produce`, but `produceWithPatches` always returns a tuple
 * [nextState, patches, inversePatches] (instead of just the next state)
 */

var produceWithPatches =
/*#__PURE__*/
immer.produceWithPatches.bind(immer);
/**
 * Pass true to automatically freeze all copies created by Immer.
 *
 * Always freeze by default, even in production mode
 */

var setAutoFreeze =
/*#__PURE__*/
immer.setAutoFreeze.bind(immer);
/**
 * Pass true to use the ES2015 `Proxy` class when creating drafts, which is
 * always faster than using ES5 proxies.
 *
 * By default, feature detection is used, so calling this is rarely necessary.
 */

var setUseProxies =
/*#__PURE__*/
immer.setUseProxies.bind(immer);
/**
 * Apply an array of Immer patches to the first argument.
 *
 * This function is a producer, which means copy-on-write is in effect.
 */

var applyPatches =
/*#__PURE__*/
immer.applyPatches.bind(immer);
/**
 * Create an Immer draft from the given base state, which may be a draft itself.
 * The draft can be modified until you finalize it with the `finishDraft` function.
 */

var createDraft =
/*#__PURE__*/
immer.createDraft.bind(immer);
/**
 * Finalize an Immer draft from a `createDraft` call, returning the base state
 * (if no changes were made) or a modified copy. The draft must *not* be
 * mutated afterwards.
 *
 * Pass a function as the 2nd argument to generate Immer patches based on the
 * changes that were made.
 */

var finishDraft =
/*#__PURE__*/
immer.finishDraft.bind(immer);
/**
 * This function is actually a no-op, but can be used to cast an immutable type
 * to an draft type and make TypeScript happy
 *
 * @param value
 */

function castDraft(value) {
  return value;
}
/**
 * This function is actually a no-op, but can be used to cast a mutable type
 * to an immutable type and make TypeScript happy
 * @param value
 */

function castImmutable(value) {
  return value;
}

exports.Immer = Immer;
exports.applyPatches = applyPatches;
exports.castDraft = castDraft;
exports.castImmutable = castImmutable;
exports.createDraft = createDraft;
exports.current = current;
exports.default = produce;
exports.enableAllPlugins = enableAllPlugins;
exports.enableES5 = enableES5;
exports.enableMapSet = enableMapSet;
exports.enablePatches = enablePatches;
exports.finishDraft = finishDraft;
exports.freeze = freeze;
exports.immerable = DRAFTABLE;
exports.isDraft = isDraft;
exports.isDraftable = isDraftable;
exports.nothing = NOTHING;
exports.original = original;
exports.produce = produce;
exports.produceWithPatches = produceWithPatches;
exports.setAutoFreeze = setAutoFreeze;
exports.setUseProxies = setUseProxies;
//# sourceMappingURL=immer.cjs.development.js.map

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1653582160812);
})()
//miniprogram-npm-outsideDeps=[]
//# sourceMappingURL=index.js.map
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160888, function(require, module, exports) {
var __TEMP__ = require('./emitter');var EventEmitter = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./wrapDataInstance');var wrapDataInstance = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./innerPlugins');var _innerPlugins = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./utils/is');var isString = __TEMP__['isString'];
var __TEMP__ = require('./utils/wrapState');var wrapState = __REQUIRE_DEFAULT__(__TEMP__);

class Global {
  constructor() {
    this.emitter = new EventEmitter();
    this.storeInstances = {};
    this.components = {};
    this.globalStoreConfig = {
      state: {}
    };
    this.messageChannel = {};
    this.router = {
      currentPath: '',
      query: null,
      context: {},
      from: '',
      viewId: '',
      fromViewId: ''
    };
    const that = this;
    this.emitter.addListener('updateCurrentPath', path => {
      Object.assign(that.router, path);
      const prevState = { ...that.globalStoreConfig.state };
      // console.info(`%c mutation: ROUTER`, 'color: #03A9F4; font-weight: bold', { ...that.router }, new Date().getTime());
      Object.assign(that.globalStoreConfig.state, {
        $router: that.router
      });
      const nextState = { ...that.globalStoreConfig.state };
      that.emitter.emitEvent('updateGlobalStore', { nextState, prevState, type: '$global:handleRouterChanged', payload: { ...path } });
    });
    this.emitter.addListener('updateState', data => {
      const { state, mutation } = data;
      const prevState = { ...that.globalStoreConfig.state };
      Object.assign(that.globalStoreConfig.state, state);
      const nextState = { ...that.globalStoreConfig.state };
      that.emitter.emitEvent('updateGlobalStore', { nextState, prevState, mutation });
    });
    this.messageManager = {
      clear: this.clearMessage.bind(this),
      push: this.pushMessage.bind(this),
      pop: this.popMessage.bind(this)
    };
  }
  subscribe(subscriber, actionSubscriber) {
    const that = this;
    this.emitter.addListener('updateGlobalStore', ({ nextState, prevState, mutation = {} }) => {
      subscriber && subscriber(mutation, wrapState(nextState), wrapState(prevState));
    });
    // if (actionSubscriber) {
    //   emitter.addListener('dispatchAction', (action) => {
    //     actionSubscriber(action);
    //   });
    // }
  }
  getGlobalState(mapGlobalToState) {
    const state = wrapDataInstance(this.globalStoreConfig.state);
    if (mapGlobalToState) {
      return mapGlobalToState(state);
    }
    return state;
  }
  clearMessage(channel) {
    if (this.messageChannel[channel]) {
      this.messageChannel[channel] = [];
    }
  }
  pushMessage(channel, payload) {
    if (this.messageChannel[channel]) {
      this.messageChannel[channel].push(payload);
    } else {
      this.messageChannel[channel] = [payload];
    }
  }
  popMessage(channel) {
    if (this.messageChannel[channel]) {
      return this.messageChannel[channel].pop();
    } else {
      return null;
    }
  }
  getCurrentPath() {
    return this.router.currentPath;
  }
  getCurrentViewId() {
    return this.router.viewId;
  }
  setGlobalStoreConfig(data) {
    this.globalStoreConfig = data;
    this.instanceName = 'global';
    if (this.globalStoreConfig.plugins) {
      this.globalStoreConfig.plugins.forEach(plugin => {
        const pluginFunc = isString(plugin) ? _innerPlugins[plugin] : plugin;
        pluginFunc(this);
      });
    }
  }
  registerComponents(name, instance) {
    this.components[name] = instance;
  }
  getComponentRef(name) {
    if (!this.components[name]) {
      console.warn(`未找到${name}组件，请检查组件名是否正确，是否在onReady后使用`);
      return null;
    }
    return this.components[name];
  }
  registerInstance(name, instance) {
    this.storeInstances[name] = instance;
  }
  getInstance(name) {
    return this.storeInstances[name];
  }
  getInstanceByViewId(id) {
    // 通过 viewid 找
    const target = Object.values(this.storeInstances).find(i => i.viewId === id);
    return target;
  }
  getState(name) {
    const target = this.storeInstances[name];
    if (target) {
      const { store } = target;
      const instance = store.getInstance();
      return instance.data;
    }
    return null;
  }
}
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = new Global();

}, function(modId) { var map = {"./emitter":1653582160880,"./wrapDataInstance":1653582160884,"./innerPlugins":1653582160881,"./utils/is":1653582160879,"./utils/wrapState":1653582160889}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160889, function(require, module, exports) {
const reserveWord = ['getIn', 'setIn', 'deleteIn', '$update', '$produce', 'compose'];

function omit(data) {
  return Object.keys(data).filter(d => reserveWord.indexOf(d) < 0).reduce((p, v) => {
    p[v] = data[v];
    return p;
  }, {});
}
// 打印时去除这类无聊信息
function wrapState(state) {
  const filteredNewState = omit(state);
  if (filteredNewState.$getters) {
    filteredNewState.$getters = omit(filteredNewState.$getters);
  }
  if (filteredNewState.$global) {
    filteredNewState.$global = omit(filteredNewState.$global);
  }
  return filteredNewState;
}

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = wrapState;

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160890, function(require, module, exports) {
var __TEMP__ = require('./utils/manipulate');var setIn = __TEMP__['setIn'];var update = __TEMP__['update'];var produce = __TEMP__['produce'];var deleteIn = __TEMP__['deleteIn'];
var __TEMP__ = require('./utils/is');var isObject = __TEMP__['isObject'];var isFunc = __TEMP__['isFunc'];var isString = __TEMP__['isString'];
var __TEMP__ = require('./global');var global = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./wrapDataInstance');var wrapDataInstance = __REQUIRE_DEFAULT__(__TEMP__);

// TODO: 这个页面需要重构！
function startsWith(data, search, pos) {
  return data.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
};

function dispatchActionPromise(instance, args) {
  return new Promise((resolve, reject) => {
    try {
      instance.emitEventChain('dispatchAction', args, d => {
        resolve(d);
      });
    } catch (e) {
      reject(e);
    }
  });
}

// 保证每次更改 store 是 immutable 的
const innerMutation = {
  $setIn: (s, d) => setIn(s, d.path, d.value),
  $update: (s, o) => update(s, o),
  $deleteIn: (s, d) => deleteIn(s, d),
  $resetStore: function() {
    const { config } = global.getInstanceByViewId(global.getCurrentViewId());
    let next = { ...config.state };
    return next;
  }
};
function mutationHandler (func, state, payload, innerHelper) {
  if (innerHelper) {
    func = isFunc(innerHelper) ? func || innerHelper : func || innerMutation[innerHelper];
  }
  if (!func) {
    return payload;
  }
  const payloadWithHelper = wrapDataInstance(payload);
  if (func._shouldImmutable) {
    return produce(state, draftState => {
      func(draftState, payloadWithHelper);
    });
  }
  const result = func(state, payloadWithHelper);
  // 确保return的值是一个新对象
  return result === state ? { ...result } : result;
}

function commitGlobal(type, payload, innerHelper) {
  const {
    mutations = {}
  } = global.globalStoreConfig;
  if (!type) {
    throw new Error(`not found ${type} action`);
  }
  if (isObject(type)) {
    payload = type;
    type = 'update';
  }
  const finalMutation = mutationHandler(mutations[type], global.getGlobalState(), payload, innerHelper);
  const tmp = { state: finalMutation, mutation: { type: `$global:${type}`, payload } };
  global.emitter.emitEvent('updateState', tmp);
  // commit 的结果是一个同步行为
  return global.getGlobalState();
}

async function dispatchGlobal(type, payload) {
  const {
    actions = {}
  } = global.globalStoreConfig;
  const actionFunc = actions[type];
  const self = this;
  let res = {};
  res = await dispatchActionPromise(global.emitter, { type, payload });
  if (!actionFunc) {
    console.warn('not found action', type, actions);
    return Promise.resolve(res);
  }
  res = await actionFunc.call(self, {
    commit: commitGlobal.bind(self),
    dispatch: dispatchGlobal.bind(self),
    message: global.messageManager,
    put: function (type, ...args) {
      const func = actions[type];
      if (!func) {
        throw new Error(`not found ${type} action`);
      }
      if (func) {
        func.apply(self, args);
      }
    },
    get state() {
      return wrapDataInstance(global.getGlobalState());
    },
    get getters() {
      return wrapDataInstance(global.getGlobalState().$getters);
    },
    get global() {
      return wrapDataInstance(global.getGlobalState());
    },
    getRef(name) {
      return global.getComponentRef(name);
    },
    select(filter) {
      return filter(wrapDataInstance({ ...global.getGlobalState() }));
    },
    getState(instanceName) {
      if (!instanceName) {
        return wrapDataInstance(global.getGlobalState());
      }
      return global.getState(instanceName);
    }
  }, wrapDataInstance(payload));
  // 保证结果为一个 promise
  if (res instanceof Promise) {
    return res;
  }
  return Promise.resolve(res);
}

function getConfigFromGlobal(global, key) {
  const targetInstanceObj = global.getInstance(key || global.getCurrentViewId());
  const instance = targetInstanceObj ? targetInstanceObj.store.getInstance() : {};
  return { ...targetInstanceObj.config, instance };
}
function getConfigFromInstance(target) {
  return {
    mutations: target.mutations,
    actions: target.actions,
    instance: target.getInstance()
  };
}
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function createConnectHelpers(global, key, config = {}, isInstance) {
  return {
    commitGlobal: commitGlobal.bind(this),
    dispatchGlobal: dispatchGlobal.bind(this),
    commit(type, payload, innerHelper) {
      const finalKey = key || global.getCurrentPath() || global.getCurrentViewId() || -1;
      const { instance, mutations = {} } = global.storeInstance ? getConfigFromInstance(global) : getConfigFromGlobal(global, finalKey);
      Object.assign(mutations, config.mutations);
      if (!type) {
        throw new Error(`${type} not found`);
      }
      if (isObject(type)) {
        payload = type;
        type = 'update';
      }
      if (isString(type) && startsWith(type, '$global:')) {
        const realType = type.split(':').pop();
        return commitGlobal.call(instance, realType, payload);
      }
      const prevState = { ...instance.data };
      const finalMutation = mutationHandler(mutations[type], wrapDataInstance(instance.data), payload, innerHelper);
      instance.$emitter.emitEvent('updateState', { state: finalMutation, mutation: { type, payload }, prevState });
      // commit 的结果是一个同步行为
      return instance.data;
    },
    async dispatch(type, payload) {
      const finalKey = key || global.getCurrentPath() || global.getCurrentViewId() || -1;
      const {
        instance,
        mutations = {},
        actions = {}
      } = global.storeInstance ? getConfigFromInstance(global) : getConfigFromGlobal(global, finalKey);
      if (!type) {
        throw new Error('action type not found');
      }
      if (isString(type) && startsWith(type, '$global:')) {
        const realType = type.split(':').pop();
        return dispatchGlobal.call(this, realType, payload);
      }
      // 获取目标 instance 的数据
      Object.assign(mutations, config.mutations);
      Object.assign(actions, config.actions);

      const actionFunc = actions[type];
      const self = this;
      let res = {};
      res = await dispatchActionPromise(instance.$emitter, { type, payload });
      if (!actionFunc) {
        console.warn('not found action', type, actions);
        return Promise.resolve(res);
      }
      res = await actionFunc.call(self, {
        commit: this.commit.bind(self),
        dispatch: this.dispatch.bind(self),
        message: global.messageManager,
        dispatchGlobal: dispatchGlobal.bind(self),
        commitGlobal: commitGlobal.bind(self),
        put: function (type, ...args) {
          const func = actions[type];
          if (!func) {
            throw new Error(`not found ${type} action`);
          }
          if (func) {
            func.apply(self, args);
          }
        },
        get state() {
          return wrapDataInstance(instance.data, self);
        },
        get getters() {
          return wrapDataInstance(instance.data.$getters, self);
        },
        get global() {
          return wrapDataInstance(instance.data.$global);
        },
        getRef(name) {
          return global.getComponentRef(name);
        },
        getState(instanceName) {
          if (!instanceName) {
            return wrapDataInstance(instance.data, self);
          }
          return global.getState(instanceName);
        },
        select(filter) {
          return filter(wrapDataInstance({ ...instance.data }));
        }
      }, wrapDataInstance(payload));
      // 保证结果为一个 promise
      if (res instanceof Promise) {
        return res;
      }
      return Promise.resolve(res);
    }
  };
};exports.createConnectHelpers = createConnectHelpers
// 创建 commit 和 dispatch instance
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function createHelpers(actions, mutationsObj, emitter, getInstance) {
  const mutations = Object.assign({}, mutationsObj, innerMutation);
  return {
    commitGlobal: commitGlobal.bind(this),
    dispatchGlobal: dispatchGlobal.bind(this),
    commit(type, payload, innerHelper) {
      if (!type) {
        throw new Error(`not found ${type} action`);
      }
      if (isObject(type)) {
        payload = type;
        type = 'update';
      }
      if (isString(type) && startsWith(type, '$global:')) {
        const realType = type.split(':').pop();
        return commitGlobal.call(this, realType, payload);
      }
      const prevState = { ...this.data };
      const finalMutation = mutationHandler(mutations[type], wrapDataInstance(this.data), payload, innerHelper);
      // 触发更新机制
      emitter.emitEvent('updateState', { state: finalMutation, mutation: { type, payload }, prevState });
      // commit 的结果是一个同步行为，返回值
      return this.data;
    },
    async dispatch(type, payload) {
      const actionCache = Object.assign({}, actions, this);
      if (!type) {
        throw new Error('action type not found');
      }
      if (isString(type) && startsWith(type, '$global:')) {
        const realType = type.split(':').pop();
        return dispatchGlobal.call(this, realType, payload);
      }
      const actionFunc = actionCache[type];
      const self = this;
      let res = {};
      res = await dispatchActionPromise(emitter, { type, payload });
      if (!actionFunc) {
        console.warn('not found action', type, actions);
        return Promise.resolve(res);
      }
      res = await actionFunc.call(self, {
        commit: this.commit.bind(self),
        dispatch: this.dispatch.bind(self),
        dispatchGlobal: dispatchGlobal.bind(self),
        commitGlobal: commitGlobal.bind(self),
        message: global.messageManager,
        put: function (type, ...args) {
          const func = actionCache[type];
          if (!func) {
            throw new Error(`not found ${type} action`);
          }
          if (func) {
            func.apply(self, args);
          }
        },
        get state() {
          return wrapDataInstance(self.data, self);
        },
        get getters() {
          return wrapDataInstance(self.data.$getters, self);
        },
        get global() {
          return wrapDataInstance(self.data.$global);
        },
        getRef(name) {
          return global.getComponentRef(name);
        },
        getState(instanceName) {
          if (!instanceName) {
            return wrapDataInstance(self.data, self);
          }
          return global.getState(instanceName);
        },
        select(filter) {
          return filter(wrapDataInstance({ ...self.data }));
        }
      }, wrapDataInstance(payload));
      // 保证结果为一个 promise
      if (res instanceof Promise) {
        return res;
      }
      return Promise.resolve(res);
    }
  };
};exports.default = createHelpers

}, function(modId) { var map = {"./utils/manipulate":1653582160885,"./utils/is":1653582160879,"./global":1653582160888,"./wrapDataInstance":1653582160884}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160891, function(require, module, exports) {
var __TEMP__ = require('./utils/is');var isString = __TEMP__['isString'];var isArray = __TEMP__['isArray'];var isFunc = __TEMP__['isFunc'];
var __TEMP__ = require('./wrapDataInstance');var wrapDataInstance = __REQUIRE_DEFAULT__(__TEMP__);

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function setDataByStateProps(mapStateToProps, data = {}, config, mapGettersToProps = [], instance, next) {
  let gettersState = {};
  // data 是增量
  const finalData = next ? instance.data : data;
  const stateToExpose = wrapDataInstance({ ...finalData });
  const gettersToExpose = wrapDataInstance({ ...finalData.$getters });
  const shouldUpdateKeys = Object.keys(data);
  const ownProps = {...this.props};

  if (mapGettersToProps) {
    gettersState = mapGettersToProps.filter(d => !!d).reduce((p, v) => {
      p[v] = gettersToExpose ? gettersToExpose[v] : (stateToExpose[v] || undefined);
      return p;
    }, {});
  }
  // 对齐 redux 的用法，第二个为 ownProps，不是很推荐，每次更新都会计算
  // TODO: 增加记忆点,暂时开发者自己保证
  if (isFunc(mapStateToProps)) {
    return mapStateToProps(stateToExpose, wrapDataInstance(ownProps), gettersToExpose);
  }
  if (isArray(mapStateToProps)) {
    // 必须新增部分包含这样的更新
    const outterState = mapStateToProps
        .filter(d => !!d && shouldUpdateKeys.includes(d))
        .reduce((p, v) => {
          p[v] = finalData[v];
          return p;
        }, {});
    return { ...outterState, ...gettersState };
  }
  const outterState = Object.keys(mapStateToProps).reduce((p, v) => {
    if (isString(mapStateToProps[v])) {
      if (!shouldUpdateKeys.includes(mapStateToProps[v])) {
        // 如果 diff 不包含第二次就不理睬
        return p;
      }
      p[v] = finalData[mapStateToProps[v]];
    } else {
      p[v] = mapStateToProps[v](stateToExpose, gettersToExpose, wrapDataInstance(ownProps), stateToExpose.$global, config);
    }
    return p;
  }, {});
  return { ...outterState, ...gettersState };
};exports.setDataByStateProps = setDataByStateProps

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function setStoreDataByState(storeData = {}, state = {}) {
  return Object.keys(state).reduce((p, v) => {
    p[v] = state[v];
    return p;
  }, storeData);
};exports.setStoreDataByState = setStoreDataByState

}, function(modId) { var map = {"./utils/is":1653582160879,"./wrapDataInstance":1653582160884}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160892, function(require, module, exports) {
var __TEMP__ = require('./createHelpers');var createConnectHelpers = __TEMP__['createConnectHelpers'];
var __TEMP__ = require('./dataTransform');var setDataByStateProps = __TEMP__['setDataByStateProps'];
var __TEMP__ = require('./mapHelpersToMethod');var mapActionsToMethod = __TEMP__['mapActionsToMethod'];var mapMutationsToMethod = __TEMP__['mapMutationsToMethod'];
var __TEMP__ = require('./utils/is');var isString = __TEMP__['isString'];

var __TEMP__ = require('./global');var global = __REQUIRE_DEFAULT__(__TEMP__);

function getPath(link, number = 1) {
  return isString(link) && link.split('/')[number];
}

const defaultConfig = {
  data: {},
  props: {},
  methods: {}
};

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function connect(options) {
  const { mapStateToProps = [], mapGettersToProps = [], instanceName = '', namespace, data = {}, props = {} } = options;
  return function (config = defaultConfig) {
    config.data = config.data || {};
    config.props = config.props || {};
    config.methods = config.methods || {};
    if (options.mapActionsToMethod) {
      mapActionsToMethod(options.mapActionsToMethod, false, config.methods);
    }
    if (options.methods) {
      mapMutationsToMethod(options.methods, config.methods);
    }
    if (options.mapMutationsToMethod) {
      mapMutationsToMethod(options.mapMutationsToMethod, config.methods);
    }
    const _didMount = config.didMount;
    const _didUnMount = config.didUnmount;
    const key = namespace || instanceName;
    Object.assign(config.data, data);
    Object.assign(config.props, props);
    return {
      ...config,
      methods: {
        ...config.methods,
        ...createConnectHelpers.call(global, global, key, config)
      },
      didMount() {
        const that = this;
        // 组件可以添加 $ref 来拿相应的实例
        const propsRef = this.props.$ref;
        const key = namespace || instanceName || global.getCurrentPath() || global.getCurrentViewId() || -1;
        const targetInstanceObj = global.getInstance(key);
        if (!targetInstanceObj && typeof _didMount === 'function') {
          console.warn('未绑定 store');
          _didMount.call(this);
          return;
        }
        // 当前component表达
        const componentIs = getPath(this.is, 2);
        const currentRoute = targetInstanceObj.store.getInstance().route;
        console.info(`${componentIs} 组件已关联 ${currentRoute}_${key} 的 store`, targetInstanceObj);
        Object.assign(this, {
          storeConfig: targetInstanceObj.config,
          storeInstance: targetInstanceObj.store
        });
        this.$emitter = global.emitter;
        const store = targetInstanceObj.store;
        this.$store = store;
        const initialData = setDataByStateProps.call(that, mapStateToProps, store.getInstance().data, config, mapGettersToProps, store.getInstance());
        this.setData(initialData);
        // 自动注册进 components 实例, propsRef 开发者自己保证唯一性
        global.registerComponents(propsRef || `${getPath(currentRoute)}:${componentIs}`, this);
        if (mapStateToProps) {
          // store 触发的更新
          this.licheexUpdateLisitener = store.$emitter.addListener('updateState', ({state = {}}) => {
            const nextData = setDataByStateProps.call(that, mapStateToProps, state, config, mapGettersToProps, store.getInstance(), true);
            const originBindViewId = this.$page.$viewId || -1;
            const currentViewId = getCurrentPages().pop() ? getCurrentPages().pop().$viewId || -1 : -1;
            if (originBindViewId !== currentViewId) return;
            that.setData(nextData);
          });
        }
        if (typeof _didMount === 'function') {
          _didMount.call(this);
        }
      },
      didUnmount() {
        this.licheexUpdateLisitener && this.licheexUpdateLisitener();
        if (typeof _didUnMount === 'function') {
          _didUnMount.call(this);
        }
      }
    };
  };
};exports.default = connect

}, function(modId) { var map = {"./createHelpers":1653582160890,"./dataTransform":1653582160891,"./mapHelpersToMethod":1653582160893,"./utils/is":1653582160879,"./global":1653582160888}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160893, function(require, module, exports) {
var __TEMP__ = require('./utils/is');var isArray = __TEMP__['isArray'];var isFunc = __TEMP__['isFunc'];var isObject = __TEMP__['isObject'];
var __TEMP__ = require('./wrapDataInstance');var wrapDataInstance = __REQUIRE_DEFAULT__(__TEMP__);
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function mapActionsToMethod(mappers, actions, target) {
  if (isArray(mappers)) {
    mappers.forEach(element => {
      // 强制不校验或校验但不通过
      if (actions === false || actions[element]) {
        target[element] = function(payload) {
          if (isObject(payload)) {
            wrapDataInstance(payload);
          }
          this.dispatch(element, payload);
        };
      }
    });
  } else if (isFunc(mappers)) {
    const result = mappers(this.dispatch, this);
    Object.assign(target, result);
  } else {
    Object.keys(mappers).forEach(element => {
      if (isFunc(methodName)) {
        target[element] = function(payload) {
          if (isObject(payload)) {
            wrapDataInstance(payload);
          }
          methodName.call(this, payload);
        };
        return;
      }
      const methodName = mappers[element];
      if (actions === false || actions[methodName]) {
        target[element] = function(e) {
          const payload = e;
          this.dispatch(methodName, payload);
        };
      }
    });
  }
};exports.mapActionsToMethod = mapActionsToMethod;

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function mapMutationsToMethod(mappers, target) {
  if (isArray(mappers)) {
    mappers.forEach(element => {
      target[element] = function(payload) {
        if (isObject(payload)) {
          wrapDataInstance(payload);
        }
        this.commit(element, payload);
      };
    });
  } else if (isFunc(mappers)) {
    const result = mappers(this.commit, this);
    Object.assign(target, result);
  } else {
    Object.keys(mappers).forEach(element => {
      const methodName = mappers[element];
      if (isFunc(methodName)) {
        target[element] = function(payload) {
          if (isObject(payload)) {
            wrapDataInstance(payload);
          }
          methodName.call(this, payload);
        };
        return;
      }
      target[element] = function(e) {
        const payload = e;
        this.commit(methodName, payload);
      };
    });
  }
};exports.mapMutationsToMethod = mapMutationsToMethod

}, function(modId) { var map = {"./utils/is":1653582160879,"./wrapDataInstance":1653582160884}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160894, function(require, module, exports) {
var __TEMP__ = require('./global');var global = __REQUIRE_DEFAULT__(__TEMP__);
var __TEMP__ = require('./storeConfigPreHandle');var configPreHandler = __REQUIRE_DEFAULT__(__TEMP__);

function getPath(link) {
  return link && link.split('/')[1];
}
// 允许空
if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });function GlobalStore(config = {}) {
  configPreHandler(config);
  global.setGlobalStoreConfig(config);
  return function(config) {
    const _onLoad = config.onLoad;
    config.onLoad = function(options) {
      global.emitter.emitEvent('updateCurrentPath', {
        currentPath: getPath(options.path),
        query: {}
      });
      _onLoad(options);
    };
    return config;
  };
};exports.default = GlobalStore;

}, function(modId) { var map = {"./global":1653582160888,"./storeConfigPreHandle":1653582160895}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160895, function(require, module, exports) {
var __TEMP__ = require('./utils/is');var isArray = __TEMP__['isArray'];var isFunc = __TEMP__['isFunc'];

function shouldImmutableDecorate(f, config) {
  if (f._shouldImmutable || f._shouldImmutable === false) {
    return;
  }
  const functionString = f.toString();
  // 当 mutation 写了 return 语句，则自己保证其 immutable，建议就使用提供的 immutable-helper
  if (config.$useImmer || !/return /gm.test(functionString)) {
    f._shouldImmutable = true;
  }
}

function wrapMutation(config) {
  Object.values(config).forEach(func => {
    shouldImmutableDecorate(func, config);
  });
}

function configPreHandler(config) {
  // 防空
  config.state = config.state || {};
  config.mutations = config.mutations || {};
  config.actions = config.actions || {};
    // 给插件提供修改初始配置的能力
  if (config.plugins) {
    config.plugins = config.plugins.map(plugin => {
      if (isArray(plugin)) {
        if (isFunc(plugin[1])) {
          plugin[1](config);
        } else {
          Object.assign(config, plugin[1]);
        }
        return plugin[0];
      }
      return plugin;
    });
  }
  // 给 mutaiton 包装是否需要 immer 操作
  if (config.mutations) {
    wrapMutation(config.mutations);
  }
  if (config.services) {
    const serviceRenameObj = Object.keys(config.services).reduce((p, v) => {
      p[`$service:${v}`] = config.services[v];
      return p;
    }, {});
    Object.assign(config.actions, serviceRenameObj);
  }
}

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = configPreHandler;

}, function(modId) { var map = {"./utils/is":1653582160879}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160896, function(require, module, exports) {
var __TEMP__ = require('../mapHelpersToMethod');var mapMutationsToMethod = __TEMP__['mapMutationsToMethod'];

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = function(register) {
  const config = {
    onLoad(data) {
      this.dispatch('pageOnLoad', data);
    },
    onReady(data) {
      this.dispatch('pageOnReady', data);
    },
    onShow(data) {
      this.dispatch('pageOnShow', data);
    },
    onHide(data) {
      this.dispatch('pageOnHide', data);
    },
    onUnload(data) {
      this.dispatch('pageOnUnload', data);
    }
  };
  mapMutationsToMethod(this.methods, config);
  return register(config);
};

}, function(modId) { var map = {"../mapHelpersToMethod":1653582160893}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160897, function(require, module, exports) {




var __TEMP__ = require('./utils/is');var isObject = __TEMP__['isObject'];var isFunc = __TEMP__['isFunc'];
var __TEMP__ = require('./utils/obj');var get = __TEMP__['get'];


var __TEMP__ = require('./Observer');var Observer = __REQUIRE_DEFAULT__(__TEMP__);

const obInstance = Observer.getInstance();

let uid = 0;

class Watcher {
  /**
   *
   * @param {Page | Component} ctx 上下文环境，小程序 Page 或者 Component 实例
   * @param {Object} options 参数
   * @param {String} options.watchPropName 监听数据自定义属性名称
   */
  constructor(ctx, options = {}) {
    const { watchPropName = '$watch' } = options;

    // 执行环境
    this.ctx = ctx;

    // data数据
    this.$data = ctx.data || {};

    // $watch数据
    this.$watch = ctx[watchPropName] || {};

    // 更新函数
    this.updateFn = ctx.setState || ctx.setData;

    // watcherId
    this.id = ++uid;

    // 收集data和globalData的交集作为响应式对象
    this.reactiveData = {};

    // 初始化操作
    this.initReactiveData();
    this.createObserver();
    this.setCustomWatcher();

    // 收集watcher
    obInstance.setGlobalWatcher(this);
  }

  // 初始化数据并首次更新
  initReactiveData() {
    const { reactiveObj } = obInstance;
    Object.keys(this.$data).forEach((key) => {
      if (key in reactiveObj) {
        this.reactiveData[key] = reactiveObj[key];
        this.update(key, reactiveObj[key]);
      }
    });
  }

  // 添加订阅
  createObserver() {
    Object.keys(this.reactiveData).forEach((key) => {
      obInstance.onReactive(key, this);
    });
  }

  // 初始化收集自定义watcher
  setCustomWatcher() {
    const watch = this.$watch;
    /* $watch为一个对象，键是需要观察的属性名或带参数的路径，值是对应回调函数，值也可以是包含选项的对象，
    其中选项包括 {function} handler   {boolean} deep   {boolean} immediate
    回调函数中参数分别为新值和旧值
    $watch: {
      'key': function(newVal, oldVal) {},
      'obj.key': {
        handler: function(newVal, oldVal) {},
        deep: true,
        immediate: true
      }
    } */
    Object.keys(watch).forEach((key) => {
      // 记录参数路径
      const keyArr = key.split('.');
      let obj = this.$data;
      for (let i = 0; i < keyArr.length - 1; i++) {
        if (!obj) return;
        obj = get(obj, keyArr[i]);
      }
      if (!obj) return;
      const property = keyArr[keyArr.length - 1];
      // 兼容两种回调函数的形式
      const cb = watch[key].handler || watch[key];
      // deep参数 支持对象/数组深度遍历
      const deep = watch[key].deep;
      this.reactiveWatcher(obj, property, cb, deep);
      // immediate参数 支持立即触发回调
      if (watch[key].immediate) this.handleCallback(cb, obj[property]);
    });
  }

  // 响应式化自定义watcher
  reactiveWatcher(obj, key, cb, deep) {
    let val = obj[key];
    // 如果需要深度监听 递归调用
    if (isObject(val) && deep) {
      Object.keys(val).forEach((childKey) => {
        this.reactiveWatcher(val, childKey, cb, deep);
      });
    }
    Object.defineProperty(obj, key, {
      enumerable: true,
      configurable: true,
      get: () => val,
      set: (newVal) => {
        if (newVal === val) return;
        // 触发回调函数
        this.handleCallback(cb, newVal, val);
        val = newVal;
        // 如果深度监听 重新监听该对象
        if (deep) this.reactiveWatcher(obj, key, cb, deep);
      },
    });
  }

  // 执行自定义watcher回调
  handleCallback(cb, newVal, oldVal) {
    if (!isFunc(cb) || !this.ctx) return;
    try {
      cb.call(this.ctx, newVal, oldVal);
    } catch (e) {
      console.warn(`[$watch error]: callback for watcher \n ${cb} \n`, e);
    }
  }

  // 移除订阅
  removeObserver() {
    // 移除相关依赖并释放内存
    obInstance.removeReactive(Object.keys(this.reactiveData), this.id);
    obInstance.removeEvent(this.id);
    obInstance.removeWatcher(this.id);
  }

  // 更新数据和视图
  update(key, value) {
    if (isFunc(this.updateFn) && this.ctx) {
      this.updateFn.call(this.ctx, { [key]: value });
    }
  }
}

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = Watcher;

}, function(modId) { var map = {"./utils/is":1653582160879,"./utils/obj":1653582160898,"./Observer":1653582160899}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160898, function(require, module, exports) {
const pathSeperatorRegex =
  /\[\s*(['"])(.*?)\1\s*\]|^\s*(\w+)\s*(?=\.|\[|$)|\.\s*(\w*)\s*(?=\.|\[|$)|\[\s*(-?\d+)\s*\]/g;

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });var isArray = exports.isArray = (objectOrArray) => Array.isArray(objectOrArray);

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });var clone = exports.clone = (objectOrArray) =>
  isArray(objectOrArray)
    ? Array.from(objectOrArray)
    : Object.assign({}, objectOrArray);

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });var has = exports.has = (object, key) => {
  return object != null && Object.prototype.hasOwnProperty.call(object, key);
};

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });var get = exports.get = (root, path, defaultValue) => {
  try {
    if (path in root) return root[path];
    if (Array.isArray(path)) path = "['" + path.join("']['") + "']";
    var obj = root;
    path.replace(
      pathSeperatorRegex,
      function (
        wholeMatch,
        quotationMark,
        quotedProp,
        firstLevel,
        namedProp,
        index
      ) {
        obj = obj[quotedProp || firstLevel || namedProp || index];
      }
    );
    return obj == undefined ? defaultValue : obj;
  } catch (err) {
    return defaultValue;
  }
};

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });var set = exports.set = (root, path, newValue) => {
  const newRoot = clone(root);
  if (typeof path === "number" || (!isArray(path) && path in newRoot)) {
    // Just set it directly: no need to loop
    newRoot[path] = newValue;
    return newRoot;
  }
  let currentParent = newRoot;
  let previousKey;
  let previousKeyIsArrayIndex = false;
  if (isArray(path)) {
    path = "['" + path.join("']['") + "']";
  }
  path.replace(
    pathSeperatorRegex,
    // @ts-ignore
    (wholeMatch, _quotationMark, quotedProp, firstLevel, namedProp, index) => {
      if (previousKey) {
        // Clone (or create) the object/array that we were just at: this lets us keep it attached to its parent.
        const previousValue = currentParent[previousKey];
        let newValue;
        if (previousValue) {
          newValue = clone(previousValue);
        } else if (previousKeyIsArrayIndex) {
          newValue = [];
        } else {
          newValue = {};
        }
        currentParent[previousKey] = newValue;
        // Now advance
        currentParent = newValue;
      }
      previousKey = quotedProp || firstLevel || namedProp || index;
      previousKeyIsArrayIndex = !!index;
      // This return makes the linter happy
      // return wholeMatch;
    }
  );
  currentParent[previousKey] = newValue;
  return newRoot;
};

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160899, function(require, module, exports) {
var __TEMP__ = require('./utils/obj');var get = __TEMP__['get'];var set = __TEMP__['set'];var has = __TEMP__['has'];
var __TEMP__ = require('./utils/is');var isFunc = __TEMP__['isFunc'];

class Observer {
  constructor() {
    // 初始化响应式对象
    this.reactiveObj = {};

    // 响应式对象集合
    this.reactiveBus = {};

    // 自定义事件集合
    this.eventBus = {};

    // 全局watcher集合
    this.globalWatchers = [];
  }

  // 获取唯一实例
  static getInstance() {
    if (!this.instance) {
      this.instance = new Observer();
    }
    return this.instance;
  }

  // 收集全局 watcher
  setGlobalWatcher(obj) {
    if (!this.isExistSameId(this.globalWatchers, obj.id)) this.globalWatchers.push(obj);
  }

  // 收集响应式数据
  onReactive(key, obj) {
    if (!this.reactiveBus[key]) this.reactiveBus[key] = [];
    if (!this.isExistSameId(this.reactiveBus[key], obj.id)) this.reactiveBus[key].push(obj);
  }

  // 收集自定义事件
  onEvent(key, callback, ctx, watcherId) {
    if (!this.eventBus[key]) this.eventBus[key] = [];
    if (this.isExistSameId(this.eventBus[key], watcherId)) {
      if (console && console.warn) console.warn(`自定义事件 '${key}' 无法重复添加，请尽快调整`);
    } else {
      this.eventBus[key].push(this.toEventObj(watcherId, callback.bind(ctx)));
    }
  }

  // 收集仅执行一次事件
  once(key, callback, watcherId) {
    // 创建一个调用后立即解绑函数
    const wrapFanc = (args) => {
      callback(args);
      this.off(key, watcherId);
    };
    this.onEvent(key, wrapFanc, watcherId);
  }

  // 转为eventBus对象
  toEventObj(id, callback) {
    return {
      id,
      callback,
    };
  }

  // 解绑自定义事件
  off(key, watcherId) {
    if (!has(this.eventBus, key)) return;
    this.eventBus[key] = this.removeById(this.eventBus[key], watcherId);
    this.removeEmptyArr(this.eventBus, key);
  }

  // 移除reactiveBus
  removeReactive(watcherKeys, id) {
    watcherKeys.forEach((key) => {
      this.reactiveBus[key] = this.removeById(this.reactiveBus[key], id);
      this.removeEmptyArr(this.reactiveBus, key);
    });
  }

  // 移除eventBus
  removeEvent(id) {
    const eventKeys = Object.keys(this.eventBus);
    eventKeys.forEach((key) => {
      this.eventBus[key] = this.removeById(this.eventBus[key], id);
      this.removeEmptyArr(this.eventBus, key);
    });
  }

  // 移除全局watcher
  removeWatcher(id) {
    this.globalWatchers = this.removeById(this.globalWatchers, id);
  }

  // 触发响应式数据更新
  emitReactive(key, value) {
    const mergeKey = key.indexOf('.') > -1 ? key.split('.')[0] : key;
    if (!has(this.reactiveBus, mergeKey)) return;
    this.reactiveBus[mergeKey].forEach((obj) => {
      if (isFunc(obj.update)) obj.update(key, value);
    });
  }

  // 触发自定义事件更新
  emitEvent(key, value) {
    if (!has(this.eventBus, key)) return;
    this.eventBus[key].forEach((obj) => {
      if (isFunc(obj.callback)) obj.callback(value);
    });
  }

  // 手动更新
  handleUpdate(key, value) {
    // key在reactiveObj中 更新reactiveObj
    if (has(this.reactiveObj, key)) {
      if (get(this.reactiveObj, key) !== value) {
        set(this.reactiveObj, key, value);
      } else {
        this.emitReactive(key, value);
      }
    } else {
      // key不在reactiveObj中 手动更新所有watcher中的$data
      this.globalWatchers.forEach((watcher) => {
        if (has(watcher.$data, key)) {
          watcher.update(key, value);
        }
      });
    }
  }

  // 判断数组中是否存在相同id的元素
  isExistSameId(arr, id) {
    if (Array.isArray(arr) && arr.length) {
      return arr.findIndex((item) => item.id === id) > -1;
    }
    return false;
  }

  // 根据id删除数组中元素
  removeById(arr, id) {
    if (Array.isArray(arr) && arr.length) {
      return arr.filter((item) => item.id !== id);
    }
    return arr;
  }

  // 删除对象中空数组的属性
  removeEmptyArr(obj, key) {
    if (!obj || !Array.isArray(obj[key])) return;
    if (obj[key].length === 0) delete obj[key];
  }
}

if (!exports.__esModule) Object.defineProperty(exports, "__esModule", { value: true });exports.default = Observer;

}, function(modId) { var map = {"./utils/obj":1653582160898,"./utils/is":1653582160879}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160900, function(require, module, exports) {
var __TEMP__ = require('./array.prototype.find');
var __TEMP__ = require('./array.prototype.findIndex');
var __TEMP__ = require('./array.prototype.includes');
var __TEMP__ = require('./string.prototype.includes');
var __TEMP__ = require('./string.prototype.startsWith');
var __TEMP__ = require('./proxy');

}, function(modId) { var map = {"./array.prototype.find":1653582160901,"./array.prototype.findIndex":1653582160902,"./array.prototype.includes":1653582160903,"./string.prototype.includes":1653582160904,"./string.prototype.startsWith":1653582160905,"./proxy":1653582160906}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160901, function(require, module, exports) {
// https://tc39.github.io/ecma262/#sec-array.prototype.find
if (!Array.prototype.find) {
  console.log('add polyfill find');
  Object.defineProperty(Array.prototype, 'find', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return kValue.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return kValue;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return undefined.
      return undefined;
    },
    configurable: true,
    writable: true
  });
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160902, function(require, module, exports) {
// https://tc39.github.io/ecma262/#sec-array.prototype.findindex
if (!Array.prototype.findIndex) {
  Object.defineProperty(Array.prototype, 'findIndex', {
    value: function(predicate) {
     // 1. Let O be ? ToObject(this value).
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If IsCallable(predicate) is false, throw a TypeError exception.
      if (typeof predicate !== 'function') {
        throw new TypeError('predicate must be a function');
      }

      // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
      var thisArg = arguments[1];

      // 5. Let k be 0.
      var k = 0;

      // 6. Repeat, while k < len
      while (k < len) {
        // a. Let Pk be ! ToString(k).
        // b. Let kValue be ? Get(O, Pk).
        // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
        // d. If testResult is true, return k.
        var kValue = o[k];
        if (predicate.call(thisArg, kValue, k, o)) {
          return k;
        }
        // e. Increase k by 1.
        k++;
      }

      // 7. Return -1.
      return -1;
    },
    configurable: true,
    writable: true
  });
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160903, function(require, module, exports) {
// https://tc39.github.io/ecma262/#sec-array.prototype.includes
if (!Array.prototype.includes) {
  console.log('add polyfill includes');
  Object.defineProperty(Array.prototype, 'includes', {
    value: function(searchElement, fromIndex) {
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      // 1. Let O be ? ToObject(this value).
      var o = Object(this);

      // 2. Let len be ? ToLength(? Get(O, "length")).
      var len = o.length >>> 0;

      // 3. If len is 0, return false.
      if (len === 0) {
        return false;
      }

      // 4. Let n be ? ToInteger(fromIndex).
      //    (If fromIndex is undefined, this step produces the value 0.)
      var n = fromIndex | 0;

      // 5. If n ≥ 0, then
      //  a. Let k be n.
      // 6. Else n < 0,
      //  a. Let k be len + n.
      //  b. If k < 0, let k be 0.
      var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      function sameValueZero(x, y) {
        return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
      }

      // 7. Repeat, while k < len
      while (k < len) {
        // a. Let elementK be the result of ? Get(O, ! ToString(k)).
        // b. If SameValueZero(searchElement, elementK) is true, return true.
        if (sameValueZero(o[k], searchElement)) {
          return true;
        }
        // c. Increase k by 1.
        k++;
      }

      // 8. Return false
      return false;
    }
  });
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160904, function(require, module, exports) {
if (!String.prototype.includes) {
  Object.defineProperty(String.prototype, 'includes', {
    value: function(search, start) {
      if (typeof start !== 'number') {
        start = 0;
      }

      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    }
  });
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160905, function(require, module, exports) {
if (!String.prototype.startsWith) {
  String.prototype.startsWith = function(search, pos) {
    return this.substr(!pos || pos < 0 ? 0 : +pos, search.length) === search;
  };
}

}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
__DEFINE__(1653582160906, function(require, module, exports) {
function proxyPolyfill() {
  let ProxyPolyfill;
  /**
   * @param {*} o
   * @return {boolean} whether this is probably a (non-null) Object
   */
  function isObject(o) {
    return o ? typeof o === "object" || typeof o === "function" : false;
  }

  function validateProto(proto) {
    if (proto !== null && !isObject(proto)) {
      throw new TypeError(
        "Object prototype may only be an Object or null: " + proto
      );
    }
  }

  const $Object = Object;

  // Closure assumes that `{__proto__: null} instanceof Object` is always true, hence why we check against a different name.
  const canCreateNullProtoObjects =
    Boolean($Object.create) || !({ __proto__: null } instanceof $Object);
  const objectCreate =
    $Object.create ||
    (canCreateNullProtoObjects
      ? function create(proto) {
          validateProto(proto);
          return { __proto__: proto };
        }
      : function create(proto) {
          validateProto(proto);
          if (proto === null) {
            throw new SyntaxError(
              "Native Object.create is required to create objects with null prototype"
            );
          }

          // nb. cast to convince Closure compiler that this is a constructor
          var T = /** @type {!Function} */ (function T() {});
          T.prototype = proto;
          return new T();
        });

  const noop = function () {
    return null;
  };

  const getProto =
    $Object.getPrototypeOf ||
    ([].__proto__ === Array.prototype
      ? function getPrototypeOf(O) {
          // If O.[[Prototype]] === null, then the __proto__ accessor won't exist,
          // as it's inherited from `Object.prototype`
          const proto = O.__proto__;
          return isObject(proto) ? proto : null;
        }
      : noop);

  /**
   * @constructor
   * @param {!Object} target
   * @param {{apply, construct, get, set}} handler
   */
  ProxyPolyfill = function (target, handler) {
    const newTarget =
      this && this instanceof ProxyPolyfill ? this.constructor : undefined;
    if (newTarget === undefined) {
      throw new TypeError("Constructor Proxy requires 'new'");
    }

    return ProxyCreate(target, handler);
  };

  /**
   * @param {!Object} target
   * @param {{apply, construct, get, set}} handler
   * @param {boolean=} allowRevocation
   */
  function ProxyCreate(target, handler, allowRevocation) {
    if (!isObject(target) || !isObject(handler)) {
      throw new TypeError(
        "Cannot create proxy with a non-object as target or handler"
      );
    }

    /** @param {string} trap */
    let throwRevoked = function (trap) {};

    // Fail on unsupported traps: Chrome doesn't do this, but ensure that users of the polyfill
    // are a bit more careful. Copy the internal parts of handler to prevent user changes.
    const unsafeHandler = handler;
    handler = { get: null, set: null, apply: null, construct: null };
    for (let k in unsafeHandler) {
      if (!(k in handler)) {
        throw new TypeError(`Proxy polyfill does not support trap '${k}'`);
      }
      handler[k] = unsafeHandler[k];
    }
    if (typeof unsafeHandler === "function") {
      // Allow handler to be a function (which has an 'apply' method). This matches what is
      // probably a bug in native versions. It treats the apply call as a trap to be configured.
      handler.apply = unsafeHandler.apply.bind(unsafeHandler);
    }

    // Define proxy as an object that extends target.[[Prototype]],
    // or a Function (if either it's callable, or apply is set).
    const proto = getProto(target); // can return null in old browsers
    let proxy;
    let isMethod = false;
    let isArray = false;
    if (typeof target === "function") {
      /** @constructor */
      proxy = function ProxyPolyfill() {
        const usingNew = this && this.constructor === proxy;
        const args = Array.prototype.slice.call(arguments);
        throwRevoked(usingNew ? "construct" : "apply");

        // TODO(samthor): Closure compiler doesn't know about 'construct', attempts to rename it.
        if (usingNew && handler["construct"]) {
          return handler["construct"].call(this, target, args);
        } else if (!usingNew && handler.apply) {
          return handler["apply"](target, this, args);
        }

        // since the target was a function, fallback to calling it directly.
        if (usingNew) {
          // inspired by answers to https://stackoverflow.com/q/1606797
          args.unshift(target); // pass class as first arg to constructor, although irrelevant
          // nb. cast to convince Closure compiler that this is a constructor
          const f = /** @type {!Function} */ (target.bind.apply(target, args));
          return new f();
        }
        return target.apply(this, args);
      };
      isMethod = true;
    } else if (target instanceof Array) {
      proxy = [];
      isArray = true;
    } else {
      proxy =
        canCreateNullProtoObjects || proto !== null ? objectCreate(proto) : {};
    }

    // Create default getters/setters. Create different code paths as handler.get/handler.set can't
    // change after creation.
    const getter = handler.get
      ? function (prop) {
          throwRevoked("get");
          return handler.get(this, prop, proxy);
        }
      : function (prop) {
          throwRevoked("get");
          return this[prop];
        };
    const setter = handler.set
      ? function (prop, value) {
          throwRevoked("set");
          const status = handler.set(this, prop, value, proxy);
          // TODO(samthor): If the calling code is in strict mode, throw TypeError.
          // if (!status) {
          // It's (sometimes) possible to work this out, if this code isn't strict- try to load the
          // callee, and if it's available, that code is non-strict. However, this isn't exhaustive.
          // }
        }
      : function (prop, value) {
          throwRevoked("set");
          this[prop] = value;
        };

    // Clone direct properties (i.e., not part of a prototype).
    const propertyNames = $Object.getOwnPropertyNames(target);
    const propertyMap = {};
    propertyNames.forEach(function (prop) {
      if ((isMethod || isArray) && prop in proxy) {
        return; // ignore properties already here, e.g. 'bind', 'prototype' etc
      }
      const real = $Object.getOwnPropertyDescriptor(target, prop);
      const desc = {
        enumerable: Boolean(real.enumerable),
        get: getter.bind(target, prop),
        set: setter.bind(target, prop),
      };
      $Object.defineProperty(proxy, prop, desc);
      propertyMap[prop] = true;
    });

    // Set the prototype, or clone all prototype methods (always required if a getter is provided).
    // TODO(samthor): We don't allow prototype methods to be set. It's (even more) awkward.
    // An alternative here would be to _just_ clone methods to keep behavior consistent.
    let prototypeOk = true;
    if (isMethod || isArray) {
      // Arrays and methods are special: above, we instantiate boring versions of these then swap
      // our their prototype later. So we only need to use setPrototypeOf in these cases. Some old
      // engines support `Object.getPrototypeOf` but not `Object.setPrototypeOf`.
      const setProto =
        $Object.setPrototypeOf ||
        ([].__proto__ === Array.prototype
          ? function setPrototypeOf(O, proto) {
              validateProto(proto);
              O.__proto__ = proto;
              return O;
            }
          : noop);
      if (!(proto && setProto(proxy, proto))) {
        prototypeOk = false;
      }
    }
    if (handler.get || !prototypeOk) {
      for (let k in target) {
        if (propertyMap[k]) {
          continue;
        }
        $Object.defineProperty(proxy, k, { get: getter.bind(target, k) });
      }
    }

    // The Proxy polyfill cannot handle adding new properties. Seal the target and proxy.
    $Object.seal(target);
    $Object.seal(proxy);

    return allowRevocation
      ? {
          proxy: proxy,
          revoke: function () {
            /** @suppress {checkTypes} */
            target = null; // clear ref
            throwRevoked = function (trap) {
              throw new TypeError(
                `Cannot perform '${trap}' on a proxy that has been revoked`
              );
            };
          },
        }
      : proxy;
  }

  ProxyPolyfill.revocable = function (target, handler) {
    return ProxyCreate(target, handler, true);
  };

  return ProxyPolyfill;
}

if (!Proxy) {
  // Export the Proxy polyfill as a global.
  // This is needed for users that use the polyfill as a module.
  global.Proxy = new proxyPolyfill();
}
}, function(modId) { var map = {}; return __REQUIRE__(map[modId], modId); })
return __REQUIRE__(1653582160878);
})()
//miniprogram-npm-outsideDeps=["./invariant","./immer.cjs.production.min.js"]
//# sourceMappingURL=index.js.map