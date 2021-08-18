const k8s = require('@kubernetes/client-node');

/**
 * Kubernates Container driver
 * 
 * Handles the creation and deletation of containers to back Projects
 * 
 * This driver creates Projects backed by Kubernates 
 * 
 * @module kubernates
 * @memberof forge.containers.drivers
 * 
 */

const podTemplate = {
  apiVersion: "v1",
  kind: "Pod",
  metadata: {
    // name: "k8s-client-test",
    labels: {
      // name: "k8s-client-test",
      nodered: "true"
      // app: "k8s-client-test",
      // "pts-node-red": "bronze"
    }   
  },
  spec: {
    containers: [
      {
        name: "node-red",
        // image: "docker-pi.local:5000/bronze-node-red",
        env:[
          // {name: "APP_NAME", value: "test"},
          {name: "MONGO_URL", value: "mongodb://mongo.default:27017/nodered"},
          {name: "TZ", value: "Europe/London"}
        ],
        ports:[
          {name: "web", containerPort: 1880, protocol: "TCP"}
        ]
      }
    ]
  },
  enableServiceLinks: false
}

const deploymentTemplate = {
  apiVersion: "apps/v1",
  kind: "Deployment",
  metadata: {
    // name: "k8s-client-test-deployment",
    labels: {
      // name: "k8s-client-test-deployment",
      nodered: "true"
      // app: "k8s-client-test-deployment"
    }
  },
  spec: {
    replicas: 1,
    selector: {
      matchLabels: {
        // app: "k8s-client-test-deployment"
      }
    },
    template: {
      metadata: {
        labels: {
          // name: "k8s-client-test-deployment",
          nodered: "true"
          // app: "k8s-client-test-deployment"
        }
      },
      spec: {
        containers: [
          {
            name: "node-red",
            // image: "docker-pi.local:5000/bronze-node-red",
            env: [
              // {name: "APP_NAME", value: "test"},
              {name: "MONGO_URL", value: "mongodb://mongo.default:27017/nodered"},
              {name: "TZ", value: "Europe/London"}
            ],
            ports: [
              {name: "web", containerPort: 1880, protocol: "TCP"}
            ]
          }
        ]
      },
      enableServiceLinks: false
    }
  }
}

const serviceTemplate = {
  apiVersion: "v1",
  kind: "Service",
  metadata: {
    // name: "k8s-client-test-service"
  },
  spec: {
    type: "NodePort",
    selector: {
      //name: "k8s-client-test"
    },
    ports: [
      { port: 1880, protocol: "TCP" }
    ]
  }
}

const ingressTemplate = {
  apiVersion: "networking.k8s.io/v1",
  kind: "Ingress",
  metadata: {
    // name: "k8s-client-test-ingress",
    namespace: "flowforge"
  },
  spec: {
    rules: [
      {
        // host: "k8s-client-test" + "." + "ubuntu.local",
        http: {
          paths: [
            {
              pathType: "Prefix",
              path: "/",
              backend: {
                service: {
                  name: "k8s-client-test-service",
                  port: { number: 1880 }
                }
              }
            }
          ]
        }
      }
    ]
  }
}

module.exports = {
  /**
   * Initialises this driver
   * @param {string} app - the Vue application 
   * @param {object} options - A set of configuration options for the driver
   * @return {forge.containers.ProjectArguments}
   */
  init: async (app, options) => {
    this._app = app;
    this._options = options;
    const kc = new k8s.KubeConfig();

    let configFile = process.env.KUBE_CONFIG_FILE || ""

    kc.loadFromFile(configFile);

    // if (this._options.configFile) {
    //   kc.loadFromFile(this._options.configFile);
    // else if (this._options.config && typeof ths._options.config === 'string') {
    //   kc.loadFromString(this._options.config);
    // else if (this._options.config && typeof ths._options.config === 'Object') {
    //   kc.loadFromOptions(this._options.config);
    // } else {
    //   kc.loadFromDefault();
    // }
    


    this._k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    this,_k8sAppApi = kc.makeApiClient(k8s.AppsV1Api);
    this._k8sNetApi = kc.makeApiClient(k8s.NetworkingV1Api);

    return {}

  },
  /**
   * Create a new Project
   * @param {string} id - id for the project
   * @param {forge.containers.Options} options - options for the project
   * @return {forge.containers.Project}
   */
  create: async (id, options) => {
    let localPod = JSON.parse(JSON.stringify(podTemplate))
    localPod.metadata.name = id;
    localPod.metadata.labels.name = id;
    localPod.metadata.labels.app = options.name;
    localPod.spec.containers[0].image = this._options.containers[options.type];
    if (options.env) {
      localPod.spec.containers[0].env.concat(options.env);
    }

    let localService = JSON.parse(JSON.stringify(serviceTemplate));
    localService.metadata.name = id;
    localService.spec.selector.name = id;

    let localIngress = JSON.parse(JSON.stringify(ingressTemplate));
    localIngress.metadata.name = id;
    localIngress.spec.rules[0].host = options.name + "." + this._options.domain;
    localIngress.spec.rules[0].http.paths[0].backend.service.name = id;

    try {
        await this._k8sApi.createNamespacedPod('flowforge', localPod)
        .then(() => {
          return this._k8sApi.createNamespacedService('flowforge', localService)
        })
        .then(() => {
          return this._k8sNetApi.createNamespacedIngress('flowforge', localIngress)
        })
    } catch (err) {
      console.log(err)
      return {error: err}
    }

    return {
      id: id,
      status: "okay",
      url: `https://${options.name}.${this._options.domain}`,
      meta: {}
    }
  },
  /**
   * Removes a Project
   * @param {string} id - id of project to remove
   * @return {Object}
   */
  remove: async (id) => {

    let promises = []

    promises.push(this._k8sNetApi.deleteNamespacedIngress(id, 'flowforge'))
    promises.push(this._k8sApi.deleteNamespacedService(id, 'flowforge'))
    promises.push(this._k8sApi.deleteNamespacedPod(id, 'flowforge'))

    try {
      let results = await Promise.all(promises)
      return {
        status: "okay"
      }
    } catch (err) {
      return {
        error: err
      }
    }
    
  },
  /**
   * Retrieves details of a project's container
   * @param {string} id - id of project to query
   * @return {Object} 
   */
  details: async (id) => {
    try {
      let details = await this._k8sApi.readNamespacePod(id, 'flowforge')
      //really need to cull this
      return details
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
    this._k8sApi.listNamespacedPod('flowforge',undefined, undefined, undefined, undefined,"nodered=true")
    .then((pods) => {
      //Turn this into a standard form
    })
  },
  /**
   * Starts a Project's container
   * @param {string} id - id of project to start
   * @return {forge.Status}
   */
  start: async (id) => {
    //there is no concept of start/stop in Kubernetes
  },
  /**
   * Stops a Proejct's container
   * @param {string} id - id of project to stop
   * @return {forge.Status}
   */
  stop: async (id) => {
    //there is no concept of start/stop in Kubernetes
  },
  /**
   * Restarts a Project's container
   * @param {string} id - id of project to restart
   * @return {forge.Status}
   */
  restart: async (id) => {
    //This needs the container killing
    this._k8sApi.replaceNamespacedPod(id, 'flowforge')
  }
}