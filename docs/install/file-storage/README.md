# FlowForge File Storage

When running in container-based environments, such as Docker or Kubernetes,
the FlowForge Projects do not have access to a persistent filesystem.

This means any files written to the container will be lost if the project is
restarted.

The FlowForge platform includes a File Storage service that can be used to provide
persistent storage to projects in two different ways:

  - A set of custom File nodes that behave the same way as the standard Node-RED
    File nodes
  - An optional Persistent Context store for storing context data within flows.
    This feature is only available for platforms running with a premium license.

*Note:* the File Storage service is only required in Docker or Kubernetes environments.
If you are running using the LocalFS platform driver, the projects have direct
access to the local filesystem already.

## Configuring

The File Storage server has its own configuration file: `etc/flowforge-storage.yml`.

 - **Docker Compose** - edit the file directly before starting the service
 - **Kubernetes/Helm** - include the options in your `customization.yml`, using `forge.fileStore.*` as the property name prefix.
   You must also set `forge.fileStore.enabled` to `true` to tell Helm to deploy the service.

There are three parts to the configuration:
 - [Platform Configuration](#platform-configuration) - how to access the main FlowForge platform application
 - [File Storage configuration](#file-storage-configuration) - what storage to use for the File nodes
 - [Persistent Context configuration](#persistent-context-configuration) - what storage to use for Persistent Context

### Platform Configuration

Option        | Description
--------------|------------
`host` | Where to listen for incoming connections. Default: `0.0.0.0`. 
`port` | The port to listen on. Default: `3001`
`base_url` | The url to access the FlowForge platform on. This defaults to `http://localhost:3000`


### File Storage configuration

The File Storage configuration determines where the files used by Node-RED File
nodes are stored.

This can be configured to either store the files on the local filesystem of the 
File Storage server, or using an AWS S3 compatible service.

#### LocalFS

Stores the files locally, for example using a volume mounted into the File Storage
server container.

Option        | Description
--------------|------------
`driver.type` | `localfs`
`driver.quota` | A per-project quota for how much data will be stored - in bytes. If this is not set, no limit will be applied
`driver.options.root` | The root path under which project data should be stored.


The following shows an example configuration using the `localfs` file driver.

```yaml
driver:
  type: localfs
  quota: 104857600
  options:
    root: var/root
```

#### S3 Compatible Storage

Stores the files in an external service using the AWS S3 API.

Option        | Description
--------------|------------
`driver.type` | `s3`
`driver.quota` | A per-project quota for how much data will be stored - in bytes. If this is not set, no limit will be applied
`driver.options.bucket` | Name of the S3 bucket to use (required)
`driver.options.region` | Name of AWS region of the bucket (required)
`driver.options.endpoint` | S3 ObjectStore Endpoint, if not using AWS S3
`driver.options.forcePathStyle` | `true`
`driver.options.credential.accessKeyId` | Account ID / Username
`driver.options.credential.secretAccessKey` | Secret Key / Password

The full list of valid options under `driver.options` is available in the [AWS S3Client documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html).

For example:

```yaml
driver:
  type: s3
  quota: 104857600
  options:
    bucket: flowforge-files
    credentials:
      accessKeyId: XXXXXXXXXXXXXXXXXXX
      secretAccessKey: XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
    forcePathStyle: true
    region: us-east-1
```

#### Enabling the FlowForge File Nodes

The FlowForge File nodes have been written to be direct replacements
for the Node-RED core file-in and file-out nodes. This means that only 
one version of these nodes can be active in a project at a time.

The FlowForge File nodes will automatically disable themselves if the 
core nodes are present. This means to enable the nodes you need to 
exclude the code nodes.

This can be done in the FlowForge Template.

<img src="../images/file-node-template.png" width=500 />

Adding `10-file.js` to the list of "Excluded nodes by filename" section will ensure that the core file nodes are not loaded by the project.

### Persistent Context configuration

The Context Storage configuration determines where Node-RED Context data is stored.

This feature is only available when running with a FlowForge Premium license.

Due to the different access patterns for context data, this requires a separate
storage configuration to the File store. It can use either an SQLite or PostgreSQL
database.

#### SQLite

Option        | Description
--------------|------------
`context.type` | `sequelize`
`context.quote` | A per-project quota for how much data will be stored - in bytes. If this is not set, no limit will be applied
`context.options.type` | `sqlite`
`context.options.storage` | Path to the sqlite database file to use

For example:

```yaml
context:
  type: sequelize
  quota: 1048576
  options:
    type: sqlite
    storage: ff-context.db
```

#### PostgreSQL

Option        | Description
--------------|------------
`context.type` | `sequelize`
`context.quote` | A per-project quota for how much data will be stored - in bytes. If this is not set, no limit will be applied
`context.options.type` | `postgres`
`context.options.host` | The hostname of the database server
`context.options.port` | The port of the database server
`context.options.database` | The name of the database to store context data in
`context.options.username` | The username to access to the database with
`context.options.password` | The password to access to the database with

For example:

```yaml
context:
  type: sequelize
  quota: 1048576
  options:
    type: postgres
    host: flowforge-postgresql
    port: 5432
    database: ff-context
    username: postgres
    password: password
```

## Working with FlowForge Devices

The FlowForge Device Agent does *not* use the File Storage service. Any flows
using the file nodes or persistent context that are deployed to a Device will use
the local filesystem directly.
