# FlowForge Platform Metrics

The FlowForge platform will send occasional pings back to a data collector
running at https://ping.flowforge.com

The payload of the ping is a collection of well-defined statistics about the
platform instance. That allows us to gather information on how the platform
is being used.

There are some golden rules about the metrics we gather:

 - They must not contain any Personally Identifiable Information
 - They must not contain any specific details of the flows or applications being
   created on the platform.

To add a new metric:

1. Identify if it fits in one of the existing metric files, or if it should be in
   a new metric file. We don't have a rule for that yet, so see what makes sense.

2. Implement the code to gather the metric.

3. Raise an issue on https://github.com/flowforge/usage-ping-collector with details
   of the new metric. The collector will need to be updated to handle it, otherwise
   the value will be dropped.
