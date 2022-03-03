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
 */
// 注册副作用函数
function effect(fn) {
  const effectFn = () => {
    // 清空以前的副作用函数
    cleanup(effectFn);
    // 当前激活的副作用函数 设置为此副作用函数
    activeEffect = effectFn;
    // 在执行副作用函数之前 将当前副作用函数记录到栈中
    effectStack.push(effectFn);
    // 执行实际的副作用函数
    fn();
    // 弹出当前执行完的副作用依赖函数
    effectStack.pop();
    // 将注册的副作用函数恢复当前依赖执行前的 依赖
    activeEffect = effectStack[effectStack.length - 1];
  }
  // 存放与该副作用函数相关联的副作用依赖集合
  effectFn.deps = [];
  effectFn();
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
  // 避免无限循环 将当前的依赖集合复制一份
  const effectsToRun = new Set(effects);
  effectsToRun && effectsToRun.forEach(fn => {
    // 当前执行的副作用 和 正在执行的副作用函数相同时 不触发此副作用的执行
    if (activeEffect !== fn) fn();
  });
  // 存在则执行
  // effects && effects.forEach(fn => fn());
}
/**
 * 222
 */
// 原始数据对象
const data = { name: "Mao", age: 22, gender: "男" }
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



// 测试
// 嵌套收集依赖 模拟组件的嵌套
function fn1() {
  effect(fn2)
  console.log(obj.name);
}
function fn2() {
  obj.age += 1;
  console.log(obj.age);
}

effect(fn1)

// setTimeout(() => {
//   obj.name = "jun"
// }, 1000)
setTimeout(() => {
  obj.age = 10;
}, 2000)
