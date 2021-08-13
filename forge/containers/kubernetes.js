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
      nodered: "true",
      // app: "k8s-client-test",
      // "pts-node-red": "bronze"
    }   
  },
  spec: {
    containers: [
      {
        name: "node-red",
        image: "docker-pi.local:5000/bronze-node-red",
        env:[
          {name: "APP_NAME", value: "test"},
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

const serviceTemplate = {
  apiVersion: "v1",
  kind: "Service",
  metadata: {
    // name: "k8s-client-test-service"
  },
  spec: {
    type: "NodePort",
    selector: {
      name: "k8s-client-test"
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
   */
  init: async (app, options) => {
    this._app = app
    const kc = new k8s.KubeConfig()
    kc.loadFromDefault()
    this._k8sApi = kc.makeApiClient(k8s.CoreV1Api)
    this,_k8sAppApi = kc.makeApiClient(k8s.AppsV1Api)
    this._k8sNetApi = kc.makeApiClient(k8s.NetworkingV1Api)
  },
  /**
   * Create a new Project
   * @param {string} id - id for the project
   * @param {forge.containers.Options} options - options for the project
   * @return {forge.containers.Project}
   */
  create: async (id, options) => {
    let localPod = JSON.parse(JSON.stringify(pod))
    localPod.metadata.name = options.name;
    localPod.metadata.labels.name = options.name;
    localPod.metadata.labels.app = options.name;
    localPod.spec.containers[0].image = this._options.containers[options.type];
    k8sApi.createNamespacedPod('flowforge', localPod)
    .then(() => {
      return k8sApi.createNamespacedService('flowforge', service)
    })
    .then(() => {

    }
    .catch(err => {
      //should roll back here
    })
  },
  /**
   * Removes a Project
   * @param {string} id - id of project to remove
   * @return {Object}
   */
  remove: async (id) => {
    
  },
  /**
   * Retrieves details of a project's container
   * @param {string} id - id of project to query
   * @return {Object} 
   */
  details: async (id) => {

  },
  /**
   * Lists all containers
   * @param {string} filter - rules to filter the containers
   * @return {Object}
   */
  list: async (filter) {

  },
  /**
   * Starts a Project's container
   * @param {string} id - id of project to start
   * @return {forge.Status}
   */
  start: async (id) => {

  },
  /**
   * Stops a Proejct's container
   * @param {string} id - id of project to stop
   * @return {forge.Status}
   */
  stop: async (id) => {

  },
  /**
   * Restarts a Project's container
   * @param {string} id - id of project to restart
   * @return {forge.Status}
   */
  restart: async (id) => {
    
  }
}