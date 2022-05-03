// 存储注册的函数 方便收集
let activeEffect = null;
let effectStack = [];// 依赖收集函数的嵌套执行 记录每次的依赖函数
// 收集副作用函数
const bucket = new WeakMap();
/**
 * 将当前依赖
 * @param {function} effectFn
 */
const cleanup = (effectFn) => {
  effectFn.deps.forEach(dep => dep.delete(effectFn));
  // 重置数组
  effectFn.deps.length = 0;
}

/**
 *
 * @param {function} fn
 * @param {{ scheduler:function, lazy:boolean }} options 选项配置
 */
// 注册副作用函数
function effect(fn, options = {}) {
  const effectFn = () => {
    // 清空以前的副作用函数
    cleanup(effectFn);
    // 当前激活的副作用函数 设置为此副作用函数
    activeEffect = effectFn;
    // 在执行副作用函数之前 将当前副作用函数记录到栈中
    effectStack.push(effectFn);
    // 执行实际的副作用函数
    const res = fn();
    // 弹出当前执行完的副作用依赖函数
    effectStack.pop();
    // 将注册的副作用函数恢复当前依赖执行前的 依赖
    activeEffect = effectStack[effectStack.length - 1];
    return res; // 返回实际副作用函数的执行结果
  }
  // 存放与该副作用函数相关联的副作用依赖集合
  // 将副作用的相关配置保存
  effectFn.options = options;
  effectFn.deps = [];
  // 函数懒执行
  if (!options?.lazy) {
    effectFn();// 执行副作用
  }
  // 将副作用函数作为返回值返回
  return effectFn;
}
/**
 * 计算属性
 * @param {*} getter 函数
 * @returns 计算属性
 */
const computed = (getter) => {
  let value; // 缓存值
  // 是否是脏数据 true表示需要重新计算值
  let dirty = true;
  // 把getter作为副作用函数 创建lazy的effect
  const effectFn = effect(getter, {
    lazy: true,
    scheduler() {
      // 依赖的数据源发生改变 出现脏数据 重置 dirty
      dirty = true;
      // 计算属性依赖的值发生改变 手动执行副作用函数
      trigger(obj, "value");
    }
  });
  const obj = {
    get value() {
      // 脏数据 表示需要重新计算
      if (dirty) {
        value = effectFn();
        dirty = false;
      }
      // 读取计算属性的值之前 手动追踪依赖
      track(obj, "value");
      return value;
    }
  }
  return obj;
}
/**
 * 监听器
 * @param {function} source getter or object
 * @param {function(newVal,oldVal, onInvalidate:function(function))} cb 回调函数
 * @param {{
 * immediate:boolean,
 * flush:'pre'|'post'|'sync',
 *
 * }} options 选项配置 immediate 是否立即执行一次回调函数
 *      flush:'pre' 组件刷新前执行
 *           :'post' 组件刷新后执行
 *           :'sync' 同步执行
 *      onInvalidate: 函数 事件监听器 注册回调函数 在当前副作用过期时执行
 */
const watch = (source, cb, options = {}) => {
  // 定义getter
  let getter;
  // 监听的是 getter函数
  if (typeof source === "function") getter = source;
  else getter = () => traverse(source);
  // newVal oldVal
  let oldVal, newVal;
  // 存储过期的副作用函数
  let cleanup;
  // 定义 onInvalidate 用来执行过期后副作用的回调
  const onInvalidate = (fn) => {
    cleanup = fn;
  }
  // const handleEffectFn
  /**
   *  值发生改变 执行副作用 执行回调函数
   */
  const job = () => {
    newVal = effectFn(); // 手动执行 拿到最新值
    // 在执行回调之前 看此回调是否过期
    if (cleanup) cleanup(); // 过期则执行过期后的函数回调
    cb(newVal, oldVal, onInvalidate);
    // 更新oldVal
    oldVal = newVal;
  }
  const effectFn = effect(getter, {
    // 开启懒执行副作用函数 用于收集返回值
    lazy: true,
    // obj 直接作为调度器执行
    scheduler: () => {
      // 组件刷新后执行-- 所以创建微任务执行
      if (options?.flush === "post") {
        Promise.resolve().then(job);
      } else {
        job(); // 正常同步执行就完事 等价于 flush =  sync
      }
    }
  });
  // 立即执行一次job 触发回调执行
  if (options?.immediate) job();
  // 手动执行副作用函数 第一次执行拿到的返回值就是oldVal
  else oldVal = effectFn();
  /**
   * 遍历监听到对象 访问一边对象的所有属性 目的是收集副作用
   * @param {*} value 对象
   * @param {*} seen 集合 记录是否访问过
   * @returns 还是源对象值 value
   */
  function traverse(value, seen = new Set()) {
    // 原始值类型数据 或者数据被读取过 不需要做任何事
    if (typeof value !== "object" || value === null || seen.has(value)) return;
    // 将数据添加到集合中 表示访问过
    seen.add(value);
    // TODO 暂时不考虑 数组等结构
    // 这里 假设 value一定是 对象结构
    for (const key of value) {
      traverse(value[key], seen);
    }
    return value;
  }
}

/**
 * 跟踪  记录副作用变化
 * @param {*} target 目标对象
 * @param {*} key 键（属性）
 */
const track = (target, key) => {
  // 没有副作用函数产生
  if (!activeEffect) return;
  // 取出当前对象存储在副作用函数桶中的 当前对象的副作用map对象
  let depsMap = bucket.get(target);
  // 第一次收集 没有该map
  if (!depsMap) bucket.set(target, (depsMap = new Map()));
  // 根据key取出当前属性的副作用 set集合
  let depsSet = depsMap.get(key);
  if (!depsSet) depsMap.set(key, depsSet = new Set());
  // 收集副作用函数了
  depsSet.add(activeEffect);
  // depsSet就是当前副作用函数存在联系的依赖集合
  // 将其放到当前副作用函数的依赖中
  activeEffect.deps.push(depsSet);
}
/**
 * 触发更新操作
 * @param {*} target 目标对象
 * @param {*} key 键（属性）
 * @returns
 */
const trigger = (target, key) => {
  // 取出当前属性的副作用函数
  const depsMap = bucket.get(target);
  if (!depsMap) return;
  // 取出副作用函数的集合
  const effects = depsMap.get(key);
  // 避免无限循环
  const effectsToRun = new Set();
  // 当前执行的副作用 和 正在执行的副作用函数相同时 不触发此副作用的执行
  effects.forEach(fn => {
    if (activeEffect !== fn) effectsToRun.add(fn);
  })
  effectsToRun.forEach(fn => {
    // 存在调度器 则将副作用函数提供给用户
    if (fn.options?.scheduler) {
      fn.options.scheduler(fn);
    } else {
      fn();
    }
  });
  // 存在则执行
  // effects && effects.forEach(fn => fn());
}
/**
 * 222
 */
// 原始数据对象
const data = { name: "Mao", age: 22, gender: "男" }
// 创建代理工厂
const createProxy = (obj) => {
  return new Proxy(obj, {
    get(target, key) {
      track(target, key);
      return target[key];
    },
    set(target, key, newVal) {
      // 设置属性值
      target[key] = newVal;
      // 触发更新
      trigger(target, key);
      // 设置属性成功了
      return true;
    }
  })
}
// 代理对象
const obj = new Proxy(data, {
  get(target, key) {
    track(target, key);
    return target[key];
  },
  set(target, key, newVal) {
    // 设置属性值
    target[key] = newVal;
    // 触发更新
    trigger(target, key);
    // 设置属性成功了
    return true;
  }
})
// 调度的副作用集合
const jobQueue = new Set();
let isFlushingQueue = false; // 是否正在刷新队列
// 建立一个微任务实例
const jobPromise = Promise.resolve();
const flushJob = () => {
  if (isFlushingQueue) return;// 队列正在刷新 什么都不做
  // 设置队列正在刷新
  isFlushingQueue = true;
  jobPromise
    .then(() => {
      jobQueue.forEach(fn => fn());
    })
    .finally(() => isFlushingQueue = false);
}
// 测试


// ----------------------------
// 测试 watch
// const p1 = createProxy({ num1: 10, num2: 20 });
// watch(() => p1.num1 + p1.num2, (newVal, oldVal) => {
//   console.log(newVal, oldVal)
// }, { immediate: true });
// p1.num1 = 20;

// const p2 = createProxy({ num1: 10, num2: 20 });
// watch(() => p2.num1 + p2.num2, (newVal, oldVal) => {
//   console.log(newVal, oldVal);
// }, {
//   // immediate: true,
//   flush: "post"
// });
// p2.num1 = 20;

const p3 = createProxy({ num1: 10, num2: 20 });
watch(() => p3.num1 + p3.num2, async (newVal, oldVal, onInvalidate) => {
  // 定义一个标志 标记当前回调副作用是否过期
  let expired = false; // 默认没过期
  // 注册副作用过期时执行的回调函数
  onInvalidate(() => {
    // 副作用过期
    expired = true;
  });
  // 模拟网络全球
  const data = await new Promise(resolve => {
    setTimeout(resolve, 2000, "请求的数据！");
  });
  // 只有当前副作用函数不过期 才会执行其他操作
  if (!expired) {
    console.log(newVal, oldVal, data);
  }
});
p3.num1 = 20;
setTimeout(() => {
  p3.num1 = 30;
}, 100) // 发现回调实际上只执行了一次
// ----------------------------


// // ----------------------------
// // 测试 computed
// const p1 = createProxy({ num1: 10, num2: 20 });
// const res1 = computed(() => p1.num1 + p1.num2);
// console.log(res1.value);
// p1.num1 = 20;
// // console.log(res1.value);
// effect(() => {
//   console.log(res1.value)
// })
// // ----------------------------


// 嵌套收集依赖 模拟组件的嵌套
function fn1() {
  console.log(obj.age); // 想要让副作用执行结果不是同步的
}


// effect(fn1, {
// 调度器 是一个函数 参数是副作用函数
//   scheduler(effectFn) {
//     jobQueue.add(effectFn);
//     flushJob();
//   }
// });
// obj.age += 10;
// obj.age += 10;
// obj.age += 10; // 发现连续多次操作出发副作用 也只会执行一次副作用函数

// function fn1() {
//   console.log(obj.name); // 想要让副作用执行结果不是同步的
// }
// effect(fn1, {
//   // 调度器 是一个函数 参数是副作用函数
//   scheduler(effectFn) {
//     setTimeout(effectFn, 1000);// 放到定时器中执行
//   }
// })

// obj.name = "张三";
console.log("-------end----------");

// effect(()=>{
//   effect(()=>{
//     obj.age+=1;
//     console.log(obj.age);
//   })
//   console.log(obj.age);
// })
// obj.age = 10;
