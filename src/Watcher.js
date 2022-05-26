



import { isObject, isFunc } from './utils/is';
import { get } from './utils/obj';


import Observer from './Observer'

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

export default Watcher;
