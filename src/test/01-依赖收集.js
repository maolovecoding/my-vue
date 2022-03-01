// 存储注册的函数 方便收集
let activeEffect = null;

// 收集副作用函数
const bucket = new WeakMap();

/**
 * 
 * @param {*} effectFn 
 */
// 注册副作用函数
function effect(effectFn) {
  activeEffect = effectFn;
  effectFn();
}
/**
 * 222
 */
// 原始数据对象
const data = { name: "Mao", age: 22, gender: "男" }
// 代理对象
const obj = new Proxy(data, {
  get(target, key) {
    // 没有副作用函数产生
    if (!activeEffect) return target[key];
    // 取出当前对象存储在副作用函数桶中的 当前对象的副作用map对象
    let depsMap = bucket.get(target);
    // 第一次收集 没有该map
    if (!depsMap) bucket.set(target, (depsMap = new Map()));
    // 根据key取出当前属性的副作用 set集合
    let depsSet = depsMap.get(key);
    if (!depsSet) depsMap.set(key, depsSet = new Set());
    // 收集副作用函数了
    depsSet.add(activeEffect);
    return target[key];
  },
  set(target, key, newVal) {
    // 设置属性值
    target[key] = newVal;
    // 取出当前属性的副作用函数
    const depsMap = bucket.get(target);
    if (!depsMap) return true;
    // 取出副作用函数的集合
    const effects = depsMap.get(key);
    // 存在则执行
    effects && effects.forEach(fn => fn())
    // 设置属性成功了
    return true;
  }
})

function fn1() {
  console.log(obj.name);
}
effect(fn1)

setTimeout(() => {
  obj.name = "jun"
}, 3000)