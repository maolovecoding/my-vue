class Person{
  constructor(name,age) {
    this.name = name;
    this.age = age;
  }
  sayHello(){
    console.log(`${this.name} say hello!`)
  }
}
const p = new Person("zs",22)
console.log(Object.getOwnPropertyNames(p))
console.log(p.sayHello)

for (const key in p) {
  console.log(key)
}
