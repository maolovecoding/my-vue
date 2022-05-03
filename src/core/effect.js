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
 * @param {Object} options 选项配置
 */
// 注册副作用函数
function effect(fn, options) {
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
  // 将副作用的相关配置保存
  effectFn.options = options;
  effectFn.deps = [];
  effectFn();
}
