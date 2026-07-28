---
navTitle: Observability
meta:
  description: Overview of how to observe a self-hosted FlowFuse platform on Kubernetes - metrics, logs, dashboards, and alerting.
  tags:
    - flowfuse
    - observability
    - monitoring
    - prometheus
    - grafana
    - loki
    - kubernetes
---

# Observability

Observability is the ability to understand the internal state and behaviour of a system by analysing its outputs, without needing to know its internal workings. For a self-hosted FlowFuse platform running on Kubernetes, this means having a holistic view of the platform and the cluster it runs on - their health, performance, and any potential issues - so you can detect and diagnose problems before they affect your users.

This page describes the kinds of tools you can use and what each is for, so you can plan an observability stack that fits your environment. It does not prescribe a specific deployment; the tools named below are common open-source choices, but the concepts apply equally to managed or commercial alternatives.

## The three pillars

Observability is usually described in terms of three complementary signals:

- **Metrics** - numeric measurements sampled over time (request rates, memory usage, pod counts). Good for dashboards, trends, and alerting thresholds.
- **Logs** - timestamped records of discrete events emitted by the platform and by the workloads running on the cluster. Good for understanding *why* something happened.
- **Dashboards & visualization** - a unified place to explore metrics and logs together, spot correlations, and share views across a team.

A complete setup collects all three and ties them together, so an alert on a metric can be investigated against the corresponding logs.

## Tools

### Prometheus

[Prometheus](https://prometheus.io/) collects and stores time-series metrics by scraping HTTP endpoints at regular intervals. For a self-hosted FlowFuse platform there are two useful sources of metrics:

- **Kubernetes cluster metrics** - cluster-level metrics such as CPU and memory usage, pod status, and node health, typically gathered via [kube-state-metrics](https://github.com/kubernetes/kube-state-metrics) and [node-exporter](https://github.com/prometheus/node_exporter).
- **Hosted Instances metrics** - every Hosted Instance is a pod running on the Kubernetes cluster. It produces metrics that are exposed by cAdvisor at the `/metrics` endpoint, which Prometheus can scrape. This includes CPU, memory and networking usage.
- **Platform metrics** - FlowFuse core deployment exposes a `/metrics` endpoint that Prometheus can scrape. This includes resources performance statistics, request rates, and error counts, etc. 

### Loki

[Loki](https://grafana.com/oss/loki/) is a log aggregation system designed to pair with Prometheus. It collects, stores, and lets you query logs from the platform and from the pods running on your cluster, so you can analyse logs alongside metrics using the same labels.

### Grafana

[Grafana](https://grafana.com/oss/grafana/) is an open-source platform for building and sharing dashboards. It provides a single interface over your observability data:

- **Data source integration** - connect Prometheus, Loki, and other sources to visualize metrics and logs in one place.
- **Customizable dashboards** - build tailored views for platform health, resource usage, and workload behaviour.
- **Alerting** - define alerting rules against your metrics and logs to be notified of problems proactively.

## Quick start

The fastest way to get started is the **LGTM stack** - Loki (logs), Grafana (dashboards), Tempo (traces), and Mimir/Prometheus (metrics) - is to either use Grafana Cloud or deploy it self-hosted:

- **Grafana Cloud (hosted)** - sign up for [Grafana Cloud](https://grafana.com/products/cloud/) and install the [Kubernetes Monitoring](https://grafana.com/docs/grafana-cloud/monitor-infrastructure/kubernetes-monitoring/) integration. It deploys collectors (Grafana Alloy) into your cluster that ship metrics and logs to Grafana's managed backend. Point one scrape target at the FlowFuse Platform metrics endpoint and you have platform plus cluster visibility with minimal setup.
- **Self-hosted LGTM** - run the stack inside your own cluster using the [`kube-prometheus-stack`](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) (Prometheus + Grafana + Alertmanager) and [`loki`](https://github.com/grafana/loki/tree/main/production/helm/loki) Helm charts. You keep full control of your data and retention, at the cost of maintaining the stack yourself.

Start with Grafana Cloud if you want results quickly and are comfortable sending telemetry off-cluster; choose self-hosted LGTM if data residency or cost at scale matters. The concepts in the rest of this page apply to either.

### Initial Grafana dashboards

Rather than building Grafana dashboards from scratch, import a few proven community dashboards to get cluster visibility on day one. In Grafana, use **Dashboards → New → Import** and enter the dashboard ID:

- **[Node Exporter Full](https://grafana.com/grafana/dashboards/1860)** (ID `1860`) - per-node CPU, memory, disk, and network from node-exporter.
- **[Kubernetes / Views / Global](https://grafana.com/grafana/dashboards/15757)** (ID `15757`) - cluster-wide health and resource usage across nodes, namespaces, and workloads.
- **[Kubernetes / Views / Pods](https://grafana.com/grafana/dashboards/15760)** (ID `15760`) - per-pod CPU, memory, and network, useful for inspecting individual Hosted Instances.

> If you deployed the `kube-prometheus-stack` Helm chart, a full set of `Kubernetes / Compute Resources / *` dashboards is installed automatically - check the dashboard list before importing duplicates.

Once the cluster basics are in place, build a FlowFuse-specific dashboard from the platform metrics described under [Prometheus](#prometheus) above.

## Next steps

- [Platform Monitoring](/docs/admin/monitoring.md) - details of the FlowFuse statistics endpoint used by Prometheus.
- [Installing FlowFuse on Kubernetes](/docs/install/kubernetes/) - deploying and configuring the platform on a cluster.
