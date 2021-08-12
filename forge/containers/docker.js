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
    init: async (app, options) => {
        this._app = app
        this._docker = new Docker({
            socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
        })
        this._options = options
    },
    create: async (name, options) => {
        console.log("creating ", name)
        var contOptions = {
            Image: "nodered/node-red:latest",
            name: name,
            Env: [
                "VIRTUAL_HOST=" + name + "." + this._options.domain,
                "APP_NAME=" + name,
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
                name: name, 
                status: "started", 
                url: `https://${name}.${this._options.domain}`,
                meta: container
            };
        } catch (err) {
            return {error: err}
        }
    },
    remove: async (name) => {
        console.log("removing ", name)
        try {
            let container = await this._docker.getContainer(name);
            await container.stop()
            await container.remove()
            return {status: "removed"}
        } catch (err) {
            return {error: err}
        }
    },
    details: async (name) => {
        try {
            let container = await this._docker.getContainer(name);
            return container
        } catch (err) {
            return {error: err}
        }
    },
    list: async (filter) => {
        let containers = await this._docker.listContainers({all: true})
        //console.log(containers)
        return containers.map(c => { return c.Names[0].substring(1)})
    },
    start: async (name) => {
        try {
            let container = await this._docker.getContainer(name);
            container.start()
        } catch (err) {

        }
    },
    stop: async (name) => {
        try {
            let container = await this._docker.getContainer(name);
            container.stop()
        } catch (err) {

        }
    },
    restart: async (name) => {
        await stop(name);
        return await start(name);
    }
}