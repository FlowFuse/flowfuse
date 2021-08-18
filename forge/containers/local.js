/**
 * Local Container driver
 * 
 * Handles the creation and deletation of containers to back Projects
 * 
 * This driver creates Projects backed by userDirectories on the local file system
 * 
 * @module localfs
 * @memberof forge.containers.drivers
 * 
 */
 
 module.exports = {
  init: async (app, options) => {
    this._app = app
    this._options = options
  },
  create: async (name, options) => {

  },
  remove: async (name) => {
    
  },
  details: async (name) => {

  },
  start: async (name) => {

  },
  stop: async (name) => {

  },
  restart: async (name) => {
    
  }
}