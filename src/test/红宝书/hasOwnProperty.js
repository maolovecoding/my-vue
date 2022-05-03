  function Person(name,age){
    this.name = name;
    this.age = age;
  }
const p1 = new Person("zs");
const p2 = new Person("zs",22);
console.log(Object.hasOwnProperty.call(p1,"age"),p1)
console.log(Object.hasOwnProperty.call(p2,"age"))
