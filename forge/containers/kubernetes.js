const k8s = require('@kubernetes/client-node');

module.exports = {
  init: async (app, options) => {
    this._app = app
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
  },
  create: async (name, options) => {

  },
  remove: async (name) => {
    
  }
}