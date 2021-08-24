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
 
const fs = require('fs');
const path = require('path');
const childProcess = require('child_process');

const initalPortNumber = 1883

module.exports = {
  /**
   * Initialises this driver
   * @param {string} app - the Vue application 
   * @param {object} options - A set of configuration options for the driver
   * @return {forge.containers.ProjectArguments}
   */
  init: async (app, options) => {
    this._app = app
    this._options = options
    this._projects = {}
    this._usedPorts = []
    this._currentPort = initalPortNumber

    if (!fs.existsSync(this._options.root)) {
      fs.mkdirSync(this._options.root)
    }
    
    return {}
  },
   /**
   * Create a new Project
   * @param {string} id - id for the project
   * @param {forge.containers.Options} options - options for the project
   * @return {forge.containers.Project}
   */
  create: async (id, options) => {

    let directory = path.join(this._options.root, id)
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory)
    }
    if (options.port && this._userProperty.contains(options.port) {
      // error port in use
    }
    let port = options.port || initalPortNumber++;
    this._usedPorts.push(port);

    let proc = childProcess.spawn('node-red',[
      "-u",
      directory,
      "-p",
      port
      ],{})

    this._projects[id] = {
      process: proc.pid,
      dir: directory,
      port: port,
      state: "running"
    }

    return Promise.resolve({
      id: id,
      status: "okay",
      url: "http://localhost:" + port,
      meta: {
        port: port
      }
    })
  },
  /**
   * Removes a Project
   * @param {string} id - id of project to remove
   * @return {Object}
   */
  remove: async (id) => {

    process.kill(this._projects[id].process,'SIGTERM')

    fs.rmdirSync(this.projects[id].directory)

    return Promise.resolve({
      status: "okay"
    })
  },
  /**
    * Retrieves details of a project's container
    * @param {string} id - id of project to query
    * @return {Object} 
    */
  details: async (id) => {
    return Promise.resolve(this._projects[id])
  },
  /**
   * Lists all containers
   * @param {string} filter - rules to filter the containers
   * @return {Object}
   */
  list: async (filter) => {

  },
  /**
   * Starts a Project's container
   * @param {string} id - id of project to start
   * @return {forge.Status}
   */
  start: async (id) => {

    let proc = childProcess.spawn('node-red',[
      "-u",
      this._projects[id].directory,
      "-p",
      this._projects[id].port
      ],{})

    this._projects[id].process = proc.pid
    this._projects[id].state = "running"
    return Promise.resolve({status: "okay"})
  },
  /**
   * Stop a Project's container
   * @param {string} id - id of project to stop
   * @return {forge.Status}
   */
  stop: async (id) => {
    process.kill(this._projects[id].process,'SIGTERM')
    this._projects[id].state = "stopped"
    return Promise.resolve({status: "okay"})
  },
  /**
   * Restarts a Project's container
   * @param {string} id - id of project to restart
   * @return {forge.Status}
   */
  restart: async (id) => {
    let rep = await stop(id);
    if (rep.status && rep.state === 'okay') {
      return await start(id);
    } else {
      return rep
    }
  }
}