'use strict'

//   ---   GROUP CONSTRUCTOR   ---
class Group {
  constructor (groupName, tree) {
    this.key = groupName
    this.resolved = false
    this.dependants = []
    this.plugins = {}
    this.result = {}
    this.tree = tree
  }

  resolve (callback) {
    for (let i in this.plugins) {
      this.result[i] = this.plugins[i].res
    }
    this.resolved = true
    callback()
  }

  hasResolvedDependencies () {
    if (this.resolved) {
      return true
    }
    for (let i in this.plugins) {
      let dep = this.plugins[i]
      if (dep) {
        if (!dep.resolved) {
          return false
        }
      }
    }
    return true
  }

  setDependants (key) {
    this.dependants.push(key)
    for (let i in this.plugins) {
      if (this.plugins[ i ]) {
        return this.plugins[ i ].setDependants(key)
      }
      throw new Error('missing dependencies: ' + key)
    }
  }
}

module.exports = Group
