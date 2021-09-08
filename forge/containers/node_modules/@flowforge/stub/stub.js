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
     * @return {forge.containers.ProjectArguments}
     */
    init: async (app, options) => {
        this._options = options

        // Should init return an object with details of config options per project?
        return {};
    },
    /**
     * Create a new Project
     * @param {string} id - id for the project
     * @param {forge.containers.Options} options - options for the project
     * @return {forge.containers.Project}
     */
    create: async (id, options) => {
        console.log("creating ", id);
        if (!list[id]) {
            list[id] = {
                id: id, 
                state: "okay", 
                url: `http://${options.name}.${this._options.domain}`,
                meta: {foo: "bar"}
            }
            return Promise.resolve(list[id]);
        } else {
            return Promise.reject({error: "Name already exists"});
        }
    },
    /**
     * Removes a Project
     * @param {string} id - id of project to remove
     * @return {Object}
     */
    remove: async (id) => {
        console.log("removing ", id);
        if (list[id]) {
            delete list[id];
            return Promise.resolve({ status: "okay" });
        } else {
            return Promise.reject({ error: id + " not found" });
        }
    },
    /**
     * Retrieves details of a project's container
     * @param {string} id - id of project to query
     * @return {Object} 
     */
    details: async (id) => {
        return Promise.resolve(list[id])
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
     * @param {string} id - id of project to start
     * @return {forge.Status}
     */
    start: async (id) => {
        if (list[id]) {
            list[id].state = "running"
            return {status: "okay"}
        } else {
            return {error: "container not found"}
        }
    },
    /**
     * Stops a Proejct's container
     * @param {string} id - id of project to stop
     * @return {forge.Status}
     */
    stop: async (id) => {
        if (list[id]) {
            list[id].state = "stopped"
            return {status: "okay"}
        } else {
            return {error: "container not found"}
        }
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