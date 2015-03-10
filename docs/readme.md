![Wiretree](https://raw.githubusercontent.com/jacoborus/wiretree/master/brand/wiretreeGreen.svg 'Wiretree logo')
================================================================================================================

Elegant dependency injection framework for Node.js.

[wiretree.jacoborus.codes](http://wiretree.jacoborus.codes/)

[![Build Status](https://travis-ci.org/jacoborus/wiretree.svg?branch=master)](https://travis-ci.org/jacoborus/wiretree)


Wiretree creates a tree with your framework configuration, then it will start your app resolving each plugin of tree by passing one or more dependencies to it. Wiretree enables to extend apps by adding more plugins without changing configuration.

Plugins can be simple node.js modules or preconfigured (at resolve time) ones, they can require another plugins or modules as dependencies, as well as return their value asynchronously.

A Wiretree plugin constructor is a function exposed as 'wiretree' in a nodejs module, its dependencies are declared as its arguments, and the value of resolved plugin is the returned value of constructor function:
```js
exports.wiretree = function (dependencyPlugin) {
    var myPlugin;
    // do something with myPlugin and dependencyPlugin
    // ...
    // and return your plugin
    return myPlugin;
};
```

Plugin constructors can be resolved asynchronously by passing its value through `wtDone` (`wtDone` is injected by Wiretree):
```js
exports.wiretree = function (wtDone) {
    doSomeAsyncOp( function (value) {
        // expose plugin
        wtDone( value );
    });
};
```


Installation
------------

```
npm install wiretree
```

