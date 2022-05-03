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
