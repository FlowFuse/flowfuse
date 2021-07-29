var list = {}

module.exports = {
    init: async (app, options) => {
        this._options = options
    },
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
    remove: async (name) => {
        console.log("removing ", name);
        if (list[name]) {
            delete list[name];
            return Promise.resolve({ status: "removed" });
        } else {
            return Promise.reject({ error: name + " not found" });
        }
    },
    details: async (name) => {
        return Promise.resolve(list[name])
    },
    list: async (filter) => {
        return Promise.resolve(list);
    },
    start: async (name) => {
        if (list[name]) {
            list[name].state = "running"
        } else {

        }
    },
    stop: async (name) => {
        if (list[name]) {
            list[name].state = "stopped"
        } else {

        }
    },
    restart: async (name) => {
        await stop(name);
        return await start(name);
    }
}