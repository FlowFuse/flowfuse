#!/bin/sh

docker run -d -v `pwd`/cluster.hocon:/opt/emqx/data/configs/cluster.hocon \
  --restart=unless-stopped \
  -v `pwd`/api-keys:/mounted/config/api-keys \
  -v `pwd`/acl.conf:/opt/emqx/data/authz/acl.conf \
  -p 1883:1883 -p 8083:8083 -p 18083:18083 --name emqx emqx/emqx:5.8
