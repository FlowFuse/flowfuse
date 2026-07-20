---
navTitle: Kubernetes Hardening
meta:
   description: Learn how to harden your Kubernetes cluster to improve security and reduce the attack surface.
   tags:
      - flowfuse
      - nodered
      - kubernetes
      - hardening
      - security
      - best practices
---

# Kubernetes Hardening

This guide walks you through the best ways to secure a Kubernetes cluster running FlowFuse. Locking down your cluster shrinks your attack surface and keeps things contained if a single component gets compromised. 
These tips work best when implemented together, so roll out as many of them as your environment allows.

{% note %}
These are general hardening recommendations. Adapt them to your organisation's security policies and your cluster's specific configuration.
{% endnote %}

## Network Policies

By default, Kubernetes allows unrestricted network traffic between all pods, across all namespaces. Any pod can reach any other pod on any port. This flat network model means that a single compromised pod, for example a vulnerable instance, can be used to reach and attack every other workload in the cluster.

Network Policies let you enforce the principle of least privilege at the network layer: a pod should only be able to talk to the workloads it genuinely needs. Restricting traffic contains lateral movement, so a breach in one component cannot trivially spread to others.

{% warning %}
**Do not treat the policies below as a copy-and-paste solution.** They are illustrative examples, tied to the assumptions of the environment they were written for - namespace names, the ingress controller, the CNI, service ports, which components are deployed, and where operators live. Applied blindly they will either break platform traffic or leave gaps you believe are closed. Network Policies are one of the easiest things in Kubernetes to get subtly wrong: a rule that *looks* correct can silently drop traffic (wrong port direction, Service vs pod port, a missing return path) or silently allow it (an unenforced CNI, an overly broad selector). Implement them deliberately, with a working understanding of how traffic actually flows in your cluster - pod-to-pod, cross-namespace, ingress, egress, and DNS. Roll out one policy at a time, start in a non-production environment, verify each addition against real traffic (and check the affected pods' logs and Service endpoints), and confirm your CNI actually enforces policies before relying on them for security.
{% endwarning %}

### FlowFuse and Network Policies

FlowFuse runs the platform (namespace of your choice, selected during Helm chart installation) and the hosted Node-RED instances (configured with the `forge.projectNamespace` Helm chart value) in separate namespaces. If you enforce Network Policies, you must explicitly allow the traffic FlowFuse needs - otherwise the instances cannot reach the platform. See [I use Kubernetes Network Policies, how can I configure them?](../../install/kubernetes/#i-use-kubernetes-network-policies%2C-how-can-i-configure-them%3F) for the required policy.

{% note %}
The following examples assume the default namespaces `flowfuse`, as a core application namespace, and `projects` for Hosted Instances namespace. If you have configured different namespaces, replace them accordingly.
{% endnote %}

The two namespaces have very different trust levels, so they are hardened differently:

- **`flowfuse`** runs trusted first-party components (core app, MQTT broker, private registry, local database). Here we restrict **inbound** traffic only — deny all ingress, then allow the connections the platform needs. Egress is left open so the platform can reach external services (licensing, npm registry, SMTP, etc.) without maintaining a brittle allow-list.
- **`projects`** runs Node-RED instances executing **user-supplied flows** - untrusted code. Here we lock down **both ingress and egress** to contain a malicious or compromised flow: it should reach only the platform services it legitimately needs, and nothing else.

### Core platform namespace (`flowfuse`)

**1. Deny all inbound traffic.** Egress is intentionally not restricted here.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-ingress
  namespace: flowfuse
spec:
  podSelector: {}
  policyTypes:
    - Ingress
```

**2. Allow inbound from the ingress controller** so users can reach the application (namespace usually `traefik`):

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-from-traefik
  namespace: flowfuse
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
```

**3. Allow inbound from the Hosted Instances** so Node-RED instances can reach the MQTT broker, core app and the private registry:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-from-projects
  namespace: flowfuse
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: projects
```

**4. Allow traffic between the platform's own components** in this namespace - the core app connecting to the database, broker and registry, plus broker clustering. As these are all trusted first-party components, we allow intra-namespace traffic:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-intra-namespace
  namespace: flowfuse
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: flowfuse
```

{% note %}
The Helm chart also ships a `flowforge-database-policy` that permits the core app → database connection when using the embedded database. The `allow-intra-namespace` rule above is a superset of it; keep both if you prefer defence in depth.
{% endnote %}

**5. Allow inbound from the EMQX operator** - The MQTT broker cluster is managed by the EMQX operator, which usually runs in its own namespace (`emqx-operator` by default) and polls the broker's management API (port `18083`) to set a pod *readiness gate*. If this is blocked, the check times out, the readiness gate never turns true, the broker pods are marked `NotReady`, their Service endpoints go empty, and every broker client fails to connect with a `503` error response. This rule is required for the operator to manage the broker cluster correctly:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-from-emqx-operator
  namespace: flowfuse
spec:
  podSelector:
    matchLabels:
      apps.emqx.io/instance: emqx
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: emqx-operator
      ports:
        - protocol: TCP
          port: 18083
```

{% note %}
The same pattern applies to any other operator, admission webhook, or metrics controller that must reach pods in this namespace: allow ingress from its namespace, or its readiness/reconcile checks will silently break your Services. If a Service unexpectedly loses its endpoints after applying policies, check the managing controller's logs for connection timeouts.
{% endnote %}

### Hosted Instances namespace (`projects`)

This namespace runs untrusted user flows, so we deny **both** directions by default and add back only what an instance legitimately needs.

**1. Deny all inbound and outbound traffic:**

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny-all
  namespace: projects
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
```

**Instance isolation comes for free here.** With no rule permitting `projects` → `projects` traffic, Node-RED instances cannot reach another in either direction. A separate "deny pod-to-pod" policy is not needed since a compromised instance already cannot talk to its neighbours.

**2. Allow DNS resolution** (cluster DNS, usually in `kube-system`):

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-dns
  namespace: projects
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: kube-system
      ports:
        - protocol: UDP
          port: 53
        - protocol: TCP
          port: 53
```

**3. Allow traffic with the ingress controller**:

- **Ingress:** users reach the Node-RED editor and dashboards
- **Egress:** allow a Hosted Instance to reach the core app and private npm registry through the ingress controller

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-traefik
  namespace: projects
spec:
  podSelector: {}
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: traefik
```

**4. Allow inbound from the platform** so the core app can manage and health-check instances:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-ingress-from-flowfuse
  namespace: projects
spec:
  podSelector: {}
  policyTypes:
    - Ingress
  ingress:
    - from:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: flowfuse
```

**5. Allow outbound to the platform services** - the MQTT broker, core app and private npm registry. Instances **should not** connect to the database directly, so it is deliberately not allowed:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-to-flowfuse
  namespace: projects
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - namespaceSelector:
            matchLabels:
              kubernetes.io/metadata.name: flowfuse
      ports:
        - protocol: TCP
          port: 1883   # MQTT broker
        - protocol: TCP
          port: 1884   # MQTT over WebSocket
        - protocol: TCP
          port: 3000   # core app pod port
        - protocol: TCP
          port: 4873   # private npm registry
```

**6. (Optional) Allow outbound to the public internet.** Thanks to the `default-deny-all` policy, instances **do not have** access to the Internet. If your flows need to call external APIs, add the rule below. It allows outbound to the internet while excluding private ranges:

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-egress-external
  namespace: projects
spec:
  podSelector: {}
  policyTypes:
    - Egress
  egress:
    - to:
        - ipBlock:
            cidr: 0.0.0.0/0
            except:
              - 10.0.0.0/8
              - 172.16.0.0/12
              - 192.168.0.0/16
      ports:
        - protocol: TCP
          port: 443
        - protocol: TCP
          port: 80
```

## TLS for Ingress

Without TLS, all traffic between users and the platform, including login credentials, session cookies, API tokens and flow data, travels in plaintext. Anyone able to observe the network path (a compromised router, a shared Wi-Fi network, a malicious intermediary) can read or tamper with it. Enabling TLS encrypts this traffic and lets clients verify they are talking to the genuine platform, protecting against eavesdropping and man-in-the-middle attacks. Serving the platform over HTTPS is a baseline requirement for any production deployment.

FlowFuse supports TLS termination either at a cloud Load Balancer or at the Kubernetes Ingress Controller (via [Cert-Manager](https://cert-manager.io/docs/)). Full configuration steps are in the installation guide:

- [I would like to secure the platform with HTTPS, how can I do that?](../../install/kubernetes/#i-would-like-to-secure-the-platform-with-https%2C-how-can-i-do-that%3F)

## Database Hardening

FlowFuse stores all its data in a PostgreSQL database. The database is a critical component of the platform, and if it is compromised, an attacker can read or modify all data. The following recommendations reduce the risk of compromise and limit the impact if it does happen.

### Use a dedicated, least-privilege database user

The FlowFuse application should connect using a dedicated database user that owns only its own database — never the PostgreSQL superuser (`postgres`). If the application's credentials are leaked, a scoped user limits the blast radius to the FlowFuse database rather than the entire database server.

Create a dedicated user and database, for example:

```sql
CREATE USER flowfuse WITH PASSWORD 'a-strong-generated-password';
CREATE DATABASE flowforge OWNER flowfuse;
```

Then configure FlowFuse to connect with these credentials. See [How to use external database server?](https://flowfuse.com/docs/install/kubernetes/#how-to-use-external-database-server%3F) for how to configure the connection in `customization.yml`.

Additional recommendations:

- **Use a strong, randomly generated password** 
- **Require TLS for database connections** so credentials and data are encrypted in transit between the platform and the database
- **Restrict network access** to the database so only the FlowFuse platform can reach it (see [Network Policies](#network-policies), or your cloud provider's firewall / security group rules for managed databases)

### Backups

Regular backups protect against data loss from accidental deletion, corruption, or a failed upgrade. A hardened deployment is not complete without a tested backup strategy.

- **External / managed database:** use your database provider's backup and point-in-time-recovery features
- **Embedded database:** if you use the Helm chart's internal PostgreSQL (`forge.localPostgresql: true`), you can schedule backups with a Kubernetes CronJob running `pg_dump`. A ready-to-use `CronJob` + `PersistentVolumeClaim` example is provided in the installation guide: [How to backup embedded database?](https://flowfuse.com/docs/install/kubernetes/#how-to-backup-embedded-database%3F)

{% warning %}
**Test your restores.** A backup is only useful if it can be restored. Periodically verify that you can restore from a backup into a clean database.
{% endwarning %}

## RBAC (Role-Based Access Control)

Kubernetes RBAC controls *who* (users, groups, service accounts) can perform *what* actions (verbs like `get`, `list`, `create`, `delete`) on *which* resources. RBAC is the primary mechanism for enforcing least privilege inside the cluster.

The core objects are:

- **Role / ClusterRole** - a set of permissions. A `Role` is namespace-scoped; a `ClusterRole` applies cluster-wide.
- **RoleBinding / ClusterRoleBinding** - grants a Role or ClusterRole to a subject (user, group or service account).

### Least-privilege principles

- **Grant the minimum.** Give each user and service account only the permissions they actually need, scoped to the narrowest namespace and resource set that works. Avoid broad wildcards (`verbs: ["*"]`, `resources: ["*"]`)
- **Never grant `cluster-admin` casually.** Reserve it for a small number of trusted administrators, day-to-day operations rarely need it
- **Prefer namespaced `Role`s over `ClusterRole`s** unless a permission genuinely must span the whole cluster
- **Audit regularly.** Review bindings periodically and remove access that is no longer needed. Command like `kubectl auth can-i --list` may help you inspect effective permissions

### Example: a read-only namespaced Role

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  namespace: flowfuse
  name: pod-reader
rules:
  - apiGroups: [""]
    resources: ["pods", "pods/log"]
    verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: read-pods
  namespace: flowfuse
subjects:
  - kind: User
    name: user@example.com
    apiGroup: rbac.authorization.k8s.io
roleRef:
  kind: Role
  name: pod-reader
  apiGroup: rbac.authorization.k8s.io
```

This grants the user `user@example.com` read-only access to pods and their logs in the `flowfuse` namespace - and nothing else.

## Other High-Level Best Practices

The following practices further reduce the attack surface of your cluster:

- **Keep Kubernetes and node images patched.** Run a supported Kubernetes version and apply security updates to the control plane, nodes, and container images promptly
- **Manage secrets properly.** Store credentials in Kubernetes Secrets (ideally with encryption at rest enabled, or an external secrets manager such as HashiCorp Vault or a cloud KMS). Never commit secrets to version control
- **Apply Pod Security Standards.** Enforce the `restricted` [Pod Security Standard](https://kubernetes.io/docs/concepts/security/pod-security-standards/) where possible: run containers as non-root, drop unnecessary Linux capabilities, use a read-only root filesystem, and disallow privilege escalation
- **Set resource requests and limits.** CPU and memory limits prevent a single workload — such as a runaway flow — from starving others and provide a defence against resource-exhaustion denial-of-service
- **Enable audit logging.** Kubernetes audit logs record who did what and when, which is essential for detecting and investigating incidents
- **Limit access to the cluster API and nodes.** Restrict the API server to trusted networks, avoid exposing the Kubelet, and disable SSH access to nodes where you can
- **Scan images for vulnerabilities.** Use image scanning in your CI pipeline and admission control to block images with known critical vulnerabilities
- **Use namespaces for isolation.** Separating workloads into namespaces makes RBAC and Network Policies easier to reason about and enforce
