![Wiretree](https://raw.githubusercontent.com/jacoborus/wiretree/master/brand/wiretree.png 'Wiretree logo')
===========================================================================================================

Elegant dependency injection framework for Node.js.

[wiretree.micronube.com](http://wiretree.micronube.com/)

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

Plugin constructors can be resolved asynchronously by passing its value througth `wtDone` (`wtDone` is injected by Wiretree):
```js
exports.wiretree = function (wtDone) {
	doSomeAsyncOp( function (value) {
		// expose plugin
		wtDone( value );
	});
};
```

Example:
--------

A typical module:

**`module.js`:**
```js
module.exports = function () {
    return 'This is a module';
}
```

A Wiretree plugin constructor:

**`plugin.js`:**
```js
exports.wiretree = function (sum) {
    return 'result is ' + sum;
}
```

**`index.js`:**
```js
var Wiretree = require( 'wiretree' );

// create a tree passing root path as parameter
var tree = new Wiretree( __dirname );


// add module `data` (without dependencies)
tree.add( {a:1, b:2}, 'data' );

// Add a wiretree plugin `sum` (module with dependencies)
var sum = function (data) {
    return data.a + data.b;
};


// load and add a module from file
tree.load( './module.js', 'mod' );

var mod = tree.get( 'mod' );
mod();
// => 'This is a module'


// load and add a wiretree plugin
tree.load( './plugin.js', 'result' );

```

**A complex example**:
Import an entire folder, sets its plugins and modules into groups and rename the keys with the provided prefix and suffix:

```js
var options = {
    group: 'myGroup',
    prefix: 'pre',
    suffix: 'Ctrl'
}

// folder method return the keynames of its plugins/modules
tree.folder( './myFolder', options);
// => ['preMyModCtrl', 'preMyPluginCtrl']

```


Installation
------------

```
npm install wiretree
```


API
---

See [https://github.com/jacoborus/wiretree/blob/master/api.md](https://github.com/jacoborus/wiretree/blob/master/api.md)



Tests
-----

```
npm install && npm test
```


Build API docs
--------------

```
npm install && npm run build-docs
```

<br><br>

---

© 2015 Jacobo Tabernero - [jacoborus](https://github.com/jacoborus)

Released under [MIT License](https://raw.github.com/jacoborus/wiretree/master/LICENSE)
