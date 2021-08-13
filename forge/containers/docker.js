const Docker = require('dockerode');

/**
 * Docker Container driver
 * 
 * Handles the creation and deletation of containers to back Projects
 * 
 * This driver creates Projects backed by Docker 
 * 
 * @module docker
 * @memberof forge.containers.drivers
 * 
 */
module.exports = {
     /**
     * Initialises this driver
     * @param {string} app - the Vue application 
     * @param {object} options - A set of configuration options for the driver
     */
    init: async (app, options) => {
        this._app = app
        this._docker = new Docker({
            socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
        })
        this._options = options
    },
    /**
     * Create a new Project
     * @param {string} id - id for the project
     * @param {forge.containers.Options} options - options for the project
     * @return {forge.containers.Project}
     */
    create: async (id, options) => {
        console.log("creating ", id)
        var contOptions = {
            Image: "nodered/node-red:latest",
            name: options.name,
            Env: [
                "VIRTUAL_HOST=" + options.name + "." + this._options.domain,
                "APP_NAME=" + options.name,
                "MONGO_URL=mongodb://mongodb/nodered"
            ],
            Labels: {
                "traefik.enable": "true"
            },
            AttachStdin: false,
            AttachStdout: false,
            AttachStderr: false,
            HostConfig: {
                NetworkMode: "internal"
            }
        };
        try {
            let container = await this._docker.createContainer(contOptions);
            await container.start();
            return {
                id: id, 
                status: "started", 
                url: `https://${options.name}.${this._options.domain}`,
                meta: container
            };
        } catch (err) {
            return {error: err}
        }
    },
    /**
     * Removes a Project
     * @param {string} id - id of project to remove
     * @return {Object}
     */
    remove: async (id) => {
        console.log("removing ", id)
        try {
            let container = await this._docker.getContainer(id);
            await container.stop()
            await container.remove()
            return {status: "removed"}
        } catch (err) {
            return {error: err}
        }
    },
    /**
     * Retrieves details of a project's container
     * @param {string} id - id of project to query
     * @return {Object} 
     */
    details: async (id) => {
        try {
            let container = await this._docker.getContainer(id);
            return container
        } catch (err) {
            return {error: err}
        }
    },
    /**
     * Lists all containers
     * @param {string} filter - rules to filter the containers
     * @return {Object}
     */
    list: async (filter) => {
        let containers = await this._docker.listContainers({all: true})
        //console.log(containers)
        return containers.map(c => { return c.Names[0].substring(1)})
    },
    /**
     * Starts a Project's container
     * @param {string} id - id of project to start
     * @return {forge.Status}
     */
    start: async (id) => {
        try {
            let container = await this._docker.getContainer(id);
            container.start()
        } catch (err) {

        }
    },
    /**
     * Stops a Proejct's container
     * @param {string} id - id of project to stop
     * @return {forge.Status}
     */
    stop: async (id) => {
        try {
            let container = await this._docker.getContainer(id);
            container.stop()
        } catch (err) {

        }
    },
    /**
     * Restarts a Project's container
     * @param {string} id - id of project to restart
     * @return {forge.Status}
     */
    restart: async (id) => {
        await stop(id);
        return await start(id);
    }
}