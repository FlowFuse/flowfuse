/**
 * Stub Container driver
 * 
 * Handles the creation and deletation of containers to back Projects
 * 
 * This Stub driver doesn't start any containers, just keeps state in memory
 * 
 * @module stub
 * @memberof forge.containers.drivers
 * 
 */
var list = {}

module.exports = {
    /**
     * Initialises this driver
     * @param {string} app - the Vue application 
     * @param {object} options - A set of configuration options for the driver
     */
    init: async (app, options) => {
        this._options = options
    },
    /**
     * Create a new Project
     * @param {string} name - name for the project
     * @param {forge.containers.Options} options - options for the project
     * @return {forge.containers.Project}
     */
    create: async (name, options) => {
        console.log("creating ", name);
        if (!list[name]) {
            list[name] = {
                name: name, 
                state: "started", 
                url: `http://${name}.${this._options.domain}`,
                meta: {foo: "bar"}
            }
            return Promise.resolve(list[name]);
        } else {
            return Promise.reject({error: "Name already exists"});
        }
    },
    /**
     * Removes a Project
     * @param {string} name - name of project to remove
     * @return {Object}
     */
    remove: async (name) => {
        console.log("removing ", name);
        if (list[name]) {
            delete list[name];
            return Promise.resolve({ status: "removed" });
        } else {
            return Promise.reject({ error: name + " not found" });
        }
    },
    /**
     * Retrieves details of a project's container
     * @param {string} name - name of project to query
     * @return {Object} 
     */
    details: async (name) => {
        return Promise.resolve(list[name])
    },
    /**
     * Lists all containers
     * @param {string} filter - rules to filter the containers
     * @return {Object}
     */
    list: async (filter) => {
        return Promise.resolve(list);
    },
    /**
     * Starts a Project's container
     * @param {string} name - name of project to start
     * @return {forge.Status}
     */
    start: async (name) => {
        if (list[name]) {
            list[name].state = "running"
            return {status: "okay"}
        } else {
            return {error: "container not found"}
        }
    },
    /**
     * Stops a Proejct's container
     * @param {string} name - name of project to stop
     * @return {forge.Status}
     */
    stop: async (name) => {
        if (list[name]) {
            list[name].state = "stopped"
            return {status: "okay"}
        } else {
            return {error: "container not found"}
        }
    },
    /**
     * Restarts a Project's container
     * @param {string} name - name of project to restart
     * @return {forge.Status}
     */
    restart: async (name) => {
        let rep = await stop(name);
        if (rep.status && rep.state === 'okay') {
            return await start(name);
        } else {
            return rep
        }
    }
}