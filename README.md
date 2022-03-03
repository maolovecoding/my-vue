# my-vue
study vuejs3.x的设计与实现


#### 调度执行
```js
function fn1() {
  console.log(obj.name); // 想要让副作用执行结果不是同步的
}
effect(fn1)

obj.name = "张三";
console.log("-------end----------"); // 让这句话先打印 然后打印副作用的执行结果
```
