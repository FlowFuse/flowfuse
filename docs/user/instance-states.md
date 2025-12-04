# FlowFuse Node-RED Instance States
The following list describes the possible states a hosted or remote Node-RED instance can find itself in.

## Stable States

- **running**: Instance is fully operational. Flows are deployed and executing normally.
- **suspended**: Instance resources are freed and flows are paused. Can be resumed without redeploying.
- **stopped**: Instance is not executing any flows and is intentionally shut down.
- **error**: Instance cannot operate normally due to a critical configuration or runtime issue. Requires user intervention.
- **crashed**: Instance terminated unexpectedly due to repeated runtime errors or failures.
- **rollback**: A previous working version of the instance has been restored due to deployment failure or manual revert.
- **warning**: Instance is running but has non-critical issues (e.g., node failures, resource limits close to threshold).
- **safe**: Running in safe mode after multiple crashes. Editor works, flows are not started until a deploy action is triggered.
- **protected**: Editor is disabled. Deployment can only occur via pipeline or controlled automation.
- **connected**: Instance has established a successful connection to its runtime environment and is reachable.

## Transitional States
- **loading**: Instance UI or resources are being prepared (initial startup or page load).
- **installing**: Required packages, dependencies, or container layers are being installed.
- **starting**: Flows and runtime services are initializing.
- **stopping**: Flows and runtime services are shutting down gracefully.
- **restarting**: Instance is stopping and then immediately starting again, typically after a deployment or configuration update.
- **suspending**: Instance flows are being paused and resources deallocated before entering suspended state.
- **importing**: An external project or configuration is being applied to the instance.
- **pushing**: Changes are being uploaded to the runtime or container registry.
- **pulling**: Artifacts or project content are being fetched from a registry or pipeline source.
