const Docker = require('dockerode');

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
                url: "",
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

    },
    stop: async (name) => {

    },
    restart: async (name) => {

    }
}