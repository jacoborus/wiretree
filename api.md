Wiretree API
============


- [Wiretree](#Wiretree)
- [get](#get)
- [add](#add)
- [load](#load)
- [folder](#folder)
- [exec](#exec)

<a name="Wiretree"></a>
Wiretree( options )
------------------------------------------------------------

Wiretree constructor
Creates new tree with options object.

**Parameters:**

- **options** *String|Object*: path to folder or options object


Options:
- rootpath: path to resolve dependencies
- keyname: name to resolve modules

Example:

Passing root path as options
```javascript
var Wiretree = require('wiretree');
var tree = new Wiretree( 'path/to/rootFolder');
```

Passing options as argument

```javascript
var Wiretree = require('wiretree');
var tree = new Wiretree({
rootpath:'path/to/rootFolder',
keyname: '_tree'
});
```

<a name="get"></a>
get( key )
------------------------------------------------------------

Get module or group of modules `key`.
This method will render all required wiretree plugins into modules

**Parameters:**

- **key** *String*: name of plugin to get
- **Return** *Object*: rendered plugin


```javascript
tree.get( 'myModule' );
// returns the module myModule

// getting myModule throught a group
var group = tree.get( 'myGroup' );
var myModule = group.myModule;
```

<a name="add"></a>
add( key, value, group, localname )
------------------------------------------------------------

Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
Returns a list of module dependencies in an `array`.

**Parameters:**

- **key** *String*: name for the plugin
- **value** *type*: plugin
- **group** *String*: (optional) name of group to add the plugin
- **localname** *String*: keyname into the group (is key by default)
- **Return** *Object*: tree


All options are optional:

- **`group`** *String*: group to add the plugin
- **`localname`** *Function*: keyname into its group. Only works when group is passed
- **`hide`** *Boolean*: expose only in group, not in tree root. Only works when group is passed


**Example**:

```javascript
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

Passing a `group` will add the module to it. `localname` is the key for the group, equals passed `key` by default

```javascript
tree.add( 1, 'homeCtrl', {
group: 'control',
localname: 'home'
});
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```

<a name="load"></a>
load( route, key, group, localname )
------------------------------------------------------------

Load a module or wiretree plugin from `route` in disk and add it into the tree.

**Parameters:**

- **route** *String*: path to plugin
- **key** *String*: name for the plugin
- **group** *String*: (optional) name of group to add the plugin
- **localname** *String*: keyname into the group (is key by default)
- **Return** *Object*: tree


Wiretree.load just checks that the files exist and add it to the tree. Modules and wiretree plugins files won't be loaded and resolved until you get them.


All options are optional:

- **`group`** *String*: group to add the plugin
- **`localname`** *Function*: keyname into its group. Only works when group is passed
- **`hide`** *Boolean*: expose only in group, not in tree root. Only works when group is passed

**Example**:

**`module`**.js:
```javascript
module.exports = function () {
return 2;
};
```
**`plugin`**.js:
```javascript
exports.wiretree = function (mod) {
return mod + 2;
};
```

**`index.js`**:
```javascript
tree.load( './module.js', 'mod' );
// => []

tree.get( 'mod' );
// => 2

tree.load( './plugin.js', 'plugin' );
// => ['mod']

tree.get( 'plugin' );
// => 4
```

Passing a `group` will add the module to it. `localname` is the key for the group, equals passed `key` by default

```javascript
tree.load( './module.js', 'homeCtrl', {
group: 'control',
localname: 'home'
});
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```

<a name="folder"></a>
folder( route, options )
------------------------------------------------------------

Load and add every file in the folder `route`.

**Parameters:**

- **route** *String*: path to folder
- **options** *Object*: 
- **Return** *Object*: tree


Filename without extension is `key` and `localname` for every file, but prefixes and suffixes can be
added to the `key` through `options.prefix` and `options.suffix` with camelCase style. These transformations
not affects the `localname` in groups.

All options are optional:

- **`group`** *String*: group to add the plugin
- **`transform`** *Function*: convert keyname passed as argument. Must return new keyname
- **`prefix`** *String*: add prefix to keyname
- **`suffix`** *String*: add suffix to keyname
- **`hide`** *Boolean*: expose only in group, not in tree root. Only works when group is passed

```javascript
tree.folder( './myFolder' );
// => ['myMod', 'myPlugin']

var options = {
hide: false,
group: 'myGroup',
prefix: 'pre',
suffix: 'Ctrl',
transform: function (key) {
return key + 'Test';
}
}

tree.folder( './myFolder', options);
// => ['preMyModTestCtrl', 'preMyPluginTestCtrl']

tree.get( 'myGroup');
// => {myModTest: [object Function], myPluginTest: [object Function]}
```

<a name="exec"></a>
exec( fn )
------------------------------------------------------------

Executes a function

**Parameters:**

- **fn** *Function*: function





