Wiretree API
============


- [Wiretree](#Wiretree)
- [then](#then)
- [add](#add)
- [load](#load)
- [folder](#folder)
- [resolve](#resolve)

<a name="Wiretree"></a>
Wiretree( folderPath )
------------------------------------------------------------

Wiretree constructor
Creates new tree
**Parameters:**
- **folderPath** *String*: path to root folder

Example:

```javascript
var Wiretree = require('wiretree');
var tree = new Wiretree( 'path/to/rootFolder');
```

<a name="then"></a>
then( fn )
------------------------------------------------------------

Executes a function and then return the tree
**Parameters:**
- **fn** *Function*: function
- **Return** *Object*: tree

Example:

```js
tree
.add('mod', 1)
.then( function () {
console.log( 'mod is added!');
})
.add(.....)
........
```

<a name="add"></a>
add( key, value, options )
------------------------------------------------------------

Add a module or wiretree plugin into the tree.
Returns tree object
**Parameters:**
- **key** *String*: name for the plugin
- **value** *Number|String|Boolean|Object|Function*: plugin
- **options** *Object*: (optional) see options
- **Return** *Object*: tree

All options are optional:

- **`group`** *String*: group to add the plugin
- **`localname`** *Function*: keyname into its group. Only works when group is passed
- **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
- **`processing`** *Function*: processing function module


**Example**:

```javascript
// add a simple module
tree.add( 'one', 1 );
// now 'one' in tree equals 1

// add a Wiretree plugin (a module with dependencies from tree)
.add( 'plugin', {
wiretree: function (one) {
return one() + 2;
}
});
// now 'plugin in tree equals 3'
```

**Async plugin example**:

Expose plugin through 'wtDone' dependency instead returning it from function
```js
tree.add( 'asyncPlugin', {
wiretree: function (wtDone) {
doSomethingAsync( function (value) {
wtDone( value );
});
}
});
```

**Group example**:

Passing a `group` will add the module to it. `localName` is how plugin will be exposed as into the group. `localName` is passed `key` by default

```javascript
tree.add( 'homeCtrl', 1, {
group: 'control',
localname: 'home'
});
// plugin is exposed as 'homeCtrl' in main tree, and as 'home' in 'control' group
// so you can inject it into other modules through main tree:
var otherPlugin = function (homeCtrl) {
// do something with homeCtrl
};
// or through its group:
var anotherPlugin = function (control) {
var homeCtrl = control.home;
// do something with homeCtrl
};
```

<a name="load"></a>
load( filePath, options )
------------------------------------------------------------

Add a plugin to tree from a file
**Parameters:**
- **filePath** *String*: path to js file
- **options** *Object*: exposing options. See **options** below
- **Return** *Object*: tree

*Options:*

- **`key`** *String*: use this value instead filename as plugin keyname in main tree.
- **`group`** *String*: group to add the plugin
- **`localname`** *String*: use this value as keyname into its group. (Only works when group is passed)
- **`hidden`** *Boolean*: expose only in group, not in tree root. (Only works when group is passed)
- **`processing`** *Function*: processing function module

Add the plugin as 'user' into the tree:
```js
tree.load( './user.js');
```

Add the plugin as 'userCtrl' into the tree and as 'user' into 'controllers' group:
```js
tree.load( './user.js', {
key: 'userCtrl'
group: 'controllers',
localname: 'user'
});
```

<a name="folder"></a>
folder( folderPath, options )
------------------------------------------------------------

Load every javascript file in `folderPath`.
**Parameters:**
- **folderPath** *String*: path to folder
- **options** *Object*: All options are optional. See options below
- **Return** *Object*: tree

*Options*:

- **`group`** *String*: group to add the plugin
- **`transform`** *Function*: get keyname passed as argument and return new keyname
- **`prefix`** *String*: add prefix to keyname
- **`suffix`** *String*: add suffix to keyname
- **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
- **`processing`** *Function*: processing function module

Example: load all javascript files in 'controllers' folder into 'controllers' group and expose them in main tree with 'Ctrl' suffix

```js
tree.load( './controllers', {
group: 'controllers',
suffix: 'Ctrl'
});
```

<a name="resolve"></a>
resolve( callback )
------------------------------------------------------------

Resolve all plugins and launch callback
**Parameters:**
- **callback** *Function*: to do after resolve tree

Example:
```js
tree
.folder('./my_folder')
.resolve( function () {
console.log( 'App is running!' );
});
```


