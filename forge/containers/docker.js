const Docker = require('dockerode');

module.exports = {
    init: async (options) => {
        this._docker = new Docker({
            socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
        })
        this._options = options
    },
    create: async (name, options) => {
        console.log("creating ", name)
        var contOptions = {
            Image: "custom-node-red",
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
        let container = await this._docker.createContainer(contOptions);
        await container.start();
        return {status: "started"};
    },
    remove: async (name) => {
        console.log("removing ", name)
        let container = await this._docker.getContainer(name);
        await container.remove()
    }
}