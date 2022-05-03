let obj = {
  [Symbol.toPrimitive](){
    return 10;
  },
  valueOf(){
    return 20;
  }
}
console.log(1+obj);
console.log(obj-1);
console.log(10 % Infinity) // 10
console.log(+0+(-0),-0+(-0), Infinity+(-Infinity))// 0 -0 NaN
