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
