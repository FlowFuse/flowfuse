# FlowForge File Storage

When running in cloud like environment (under Docker or Kubernetes)
FlowForge projects do not have access to a persistent filesystem to 
use to store files. Files written to the container file system will 
be lost if the project is restarted.

For this reason we recommend that the Node-RED core file nodes are
disabled on these platforms.

To solve this limitation FlowForge provides a set of replacement
file nodes. These are backed by Object Store which can be configured
to use a mounted volume or S3 bucket.

The FlowForge File Storage system can also be used with the FlowForge
LocalFS build. In this case the FlowForge Projects already have
direct access to the file system of the machine hosting FlowForge.

## Configuring

The Docker Compose and Kubernetes Helm Chart will both now start a 
container running the File Server application.

There are 3 main things to set up:

 1. Which backend to use (`localfs` or `s3`)
 2. The quota for each project in bytes (not set is unlimited)
 3. The configuration options for the backend

These are set in the `etc/flowforge-storage.yml` file.
### LocalFS

This can be used when you mount a volume into the File Server container
to persist files.

The only configuration option used is the path to the directory to use
as the root of the storage

```yaml
host: 0.0.0.0
port: 3001
base_url: http://flowforge:3000
driver:
  type: localfs
  quota: 104857600
  options:
    root: var/root
```

### S3 Compatible Storage

- options
    - bucket - name of S3 Bucket (required)
    - region - AWS Region for the bucket (required)
    - endpoint - S3 ObjectStore Endpoint (if not using AWS S3)
    - forcePathStyle: true
    - credential
        - accessKeyId - AccountID/Username
        - secretAccessKey - SecretKey/Password

For further reference of all available options you can look at the S3Client documentation [here](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/clients/client-s3/interfaces/s3clientconfig.html)

For example:

```yaml
host: '0.0.0.0'
port: 3001
base_url: http://forge.default
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

## Docker Compose

You can configure the backend store for the File Server by editing the 
`etc/flowforge-storage.yml` file. It defaults to using the `localfs` 
backend driver and mounting a directory into the container.

File Storage quota defaults to 100MB per project

## Kubernetes Helm

You can configure the backend store for the File server by including 
the following values passed to helm

- `forge.fileStore.enabled` - defaults to `false`
- `forge.fileStore.type` - defaults to `localfs`
- `forge.fileStore.quota` - defaults to `104857600` bytes (100mb)
- `forge.fileStore.options` - an object that matches the Yaml described above

## Enabling the FlowForge File Nodes

The FlowForge File nodes have been written to be direct replacements
for the Node-RED core file-in and file-out nodes. This means that only 
one version of these nodes can be active in a project at a time.

The FlowForge File nodes will automatically disable themselves if the 
core nodes are present. This means to enable the nodes you need to 
exclude the code nodes.

This can be done in the FlowForge Template.

<img src="../images/file-node-template.png" width=500 />

Adding `10-file.js` to the list of "Excluded nodes by filename" section will ensure that the core file nodes are not loaded by the project.

## Persistent Context

For FlowForge Premium licensees the File Server component also provides a Persistent Context Store.

### Configuring 

The Persistent Context Store uses a database backend to hold state. It can be used with a SQLite or PostgreSQL database.
This is configured in the `etc/flowforge-storage.yml` file similar to the File Store driver mentioned earlier.

#### SQLite

```yaml
context:
  type: sequelize
  quota: 1048576
  options:
    type: sqlite
    storage: ff-context.db
```

#### PostgreSQL

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

### Docker and Kubernetes

For both Docker and Kubernetes come with a the context store configured with default values, uploading 
a license for the FlowForge application will enable it, but existing projects will require suspending 
and restarting to pick up the change.

The default quota is 1KB per project which can be overridden as follows:

- on Docker edit the `etc/flowforge-storage.yml` file.
- on Kubernetes set the `forge.fileStore.context.quota` value in bytes when passing helm.
    - `forge.fileStore.context.options` holds driver options

## Working with FlowForge Devices

Because the FlowForge File nodes are a direct replacement for the
Node-RED core file nodes you can use them to build flows
in the cloud that can then be deployed to a device and make use of 
the file system on the device.

When a snapshot is pushed to a device the Node-RED core file nodes 
will be loaded.