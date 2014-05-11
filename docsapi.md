API
---



Wiretree constructor( options )
-------------------------------


**Parameters**:

- **options**:  *String|Object*,  root path or options


Creates new tree with options object.

Options:
- rootpath: path to resolve dependencies
- keyname: name to resolve modules

Example:

Passing root path as options

```js
var Wiretree = require('wiretree');
var tree = new Wiretree( 'path/to/rootFolder');
```

Passing options as argument

```js
var Wiretree = require('wiretree');
var tree = new Wiretree({
   rootpath:'path/to/rootFolder',
   keyname: '_tree'
});
```



.get( key )
-----------

**Parameters**:

- **key**:  *String*,  name of plugin to get
- **Return** a *Object*:  rendered plugin


Get module or group of modules `key`.
This method will render all required wiretree plugins into modules

```js
tree.get( 'myModule' );
// returns the module myModule

// getting myModule throught a group
var group = tree.get( 'myGroup' );
var myModule = group.myModule;
```



.add( key, value, group, localName )
------------------------------------

**Parameters**:

- **key**:  *String*,  name for the plugin
- **value**:  *type*,  plugin
- **group**:  *String*,  (optional) name of group to add the plugin
- **localName**:  *String*,  (optional) keyname into the group (`localName` is `key` by default)
- **Return** an *Array*,  list of dependencies names



Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
Returns a list of module dependencies in an `array`.

**Example**:

```js
// Add and get a simple module
var addon = 2;

tree.add( addon, 'mod' );
// => []

tree.get( 'mod' );
// => 2

// Add and get a wiretree plugin (a module with dependencies)
var plugin = function (mod) { return mod + 2; };

tree.add( {wiretree: plugin}, 'plugin' );
// => ['mod']

tree.get( 'plugin' );
// => 4
```

Passing a `group` will add the module to it. `localName` is the key for the group, equals passed `key` by default

```js
tree.add( 1, 'homeCtrl', 'control', 'home');
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```



.load( key, route, group, localName )
-------------------------------------


**Parameters**

- **key**:  *String*,  name for the plugin
- **route**:  *String*,  path to plugin
- **group**:  *String*,  (optional) name of group to add the plugin
- **localName**:  *String*,  (optional) keyname into the group (`localName` is `key` by default)
- **Returns** an *Array*:  list of dependencies names


Load a module or wiretree plugin from `route` in disk and add it into the tree. Wiretree plugins won't be resolved until you get them.
Returns a list of module dependencies in an `array`.

**Example**:

**`module.js`**:
```js
module.exports = function () {
    return 2;
};
```

**`plugin.js`**:
```js
module.exports.wiretree = function (mod) {
    return mod + 2;
};
```

**`index.js`**:
```js
tree.load( './module.js', 'mod' );
// => []

tree.get( 'mod' );
// => 2

tree.load( './plugin.js', 'plugin' );
// => ['mod']

tree.get( 'plugin' );
// => 4
```

Passing a `group` will add the module to it. `localName` is the key for the group, equals passed `key` by default

```js
tree.load( './module.js', 'homeCtrl', 'control', 'home');
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```



.folder( route, options )
-------------------------


**Parameters**

- **route**:  *String*,  path to folder
- **options**:  *Object*
- **Return** an *Array*:  list of keys of modules added


Load and add every file in the folder `route`.

Each file inside folder will be added using the filename (without extension) as `key` and `localName`,
using `options.prefix` and `options.suffix` as a prefix and suffix on the `key` accordingly, `localName` will
remain unchanged.

Returns list of `key`s in an `array`

```js
tree.folder( './myFolder' );
// => ['myMod', 'myPlugin']

var options = {
    group: 'myGroup',
    prefix: 'pre',
    suffix: 'Ctrl'
}

tree.folder( './myFolder', options);
// => ['preMyModCtrl', 'preMyPluginCtrl']

tree.get( 'myGroup');
// => {myMod: [object Function], myPlugin: [object Function]}
```
