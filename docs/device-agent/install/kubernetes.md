---
navGroup: DeviceAgentInstallation
navTitle: Kubernetes Install
navOrder: 4
meta:
  description: Run the FlowFuse Device Agent in a Kubernetes cluster
  tags:
     - device agent
     - kubernetes
     - installation
---

# Kubernetes Install

Any deployment on Kubernetes is going to be specific to the environment and requirements of the solution. The following examples show two common patterns for running the FlowFuse Device Agent on Kubernetes:

- Fixed configuration using a static `device.yml`
- Automatic provisioning using a FlowFuse Provisioning Token

Choose the approach that matches how you manage device lifecycle and credentials.

## Fixed Configuration

If you have an existing `device.yml` file containing a set of Device Agent credentials.

```bash
kubectl create secret generic device-one-secret --from-file=device.yml=./device.yml
```

The following manifest will create a Deployment and Service for a device using the supplied Secret as its credentials

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: device-one
  labels:
    app: device-one
spec:
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: device-one
  template:
    metadata:
      labels:
        app: device-one
    spec:
      containers:
      - name: device-one
        image: flowfuse/device-agent:latest
        ports:
        - containerPort: 1880
        volumeMounts:
        - name: config
          mountPath: "/opt/flowfuse-device/device.yml"
          subPath: "device.yml"
          readOnly: true
        resources:
          limits:
            cpu: 1000m
            memory: 256Mi
          requests:
            cpu: 500m
            memory: 128Mi
      volumes:
      - name: config
        secret:
          secretName: device-one-secret
---
apiVersion: v1
kind: Service
metadata:
  name: device-one-service
spec:
  selector:
    app: device-one
  ports:
  - protocol: TCP
    port: 1880
    targetPort: 1880
```

## Automatic Provisioning

Using a FlowFuse Provisioning Token to automatically configure a new Device Agent on deployment.

Because the Device Agent will need to re-write the `device.yml` file it can no longer be stored in a Secret and a PersistentVolume must be used for each instance of the Device Agent.

A Secret is used to hold the initial `device.yml` which contains the provisioning token.

```bash
kubectl create secret generic device-provisioning-secret --from-file=device.yml=./device.yml
```

The following manifest will create a Deployment, Service and PVC for a device using the supplied Secret as the source of the Provisioning token.

The PVC will be used to store the updated `device.yml` and the Node-RED nodes installed by the Remote Instance.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: device-one
  labels:
    app: device-one
spec:
  replicas: 1
  revisionHistoryLimit: 10
  selector:
    matchLabels:
      app: device-one
  template:
    metadata:
      labels:
        app: device-one
    spec:
      initContainers:
      - name: config-copy
        image: busybox:latest
        command: 
        - "/bin/sh"
        - "-c"
        - "if [ ! -f /opt/flowfuse-device/device.yml ]; then cp /tmp/device.yml /opt/flowfuse-device/device.yml; fi"
        volumeMounts:
        - name: config
          mountPath: "/opt/flowfuse-device"
        - name: initial-config
          mountPath: "/tmp/device.yml"
          subPath: "device.yml"
          readOnly: true
      containers:
      - name: device-one
        image: flowfuse/device-agent:latest
        ports:
        - containerPort: 1880
        volumeMounts:
        - name: config
          mountPath: "/opt/flowfuse-device"
        resources:
          limits:
            cpu: 1000m
            memory: 256Mi
          requests:
            cpu: 500m
            memory: 128Mi
      volumes:
      - name: initial-config
        secret:
          secretName: device-provisioning-secret
      - name: config
        persistentVolumeClaim:
          claimName: device-one-pvc
        
---
apiVersion: v1
kind: Service
metadata:
  name: device-one-service
spec:
  selector:
    app: device-one
  ports:
  - protocol: TCP
    port: 1880
    targetPort: 1880
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: device-one-pvc
spec:
  accessModes:
  - ReadWriteOnce
  resources:
    requests:
      storage: 1Gi
```