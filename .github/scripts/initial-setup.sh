#!/usr/bin/env bash
# This script is used to run initial setup of the pre-staging environment

set -e

PR_NUMBER=$1
INIT_CONFIG_PASSWORD_HASH=$2
INIT_CONFIG_ACCESS_TOKEN_HASH=$3
INIT_CONFIG_ACCESS_TOKEN=$4
INIT_CONFIG_PASSWORD=$5
FLOWFUSE_URL="${6:-$PR_NUMBER.flowfuse.dev}"


create_user() {
  local USERNAME=$1
  local PASSWORD="${INIT_CONFIG_PASSWORD}"

  echo "Creating $USERNAME user"
  curl -ks -XPOST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
    -d '{
      "name": "'"$USERNAME"'",
      "username": "'"$USERNAME"'",
      "password": "'"$PASSWORD"'",
      "email": "'"$USERNAME@flowfuse.dev"'",
      "isAdmin": false,
      "createDefaultTeam": false
    }' "https://$FLOWFUSE_URL/api/v1/users/"
}

create_team() {
  local TEAM_TYPE_SELECTOR=$1
  local TEAM_NAME=$2
  local TEAM_TYPE_ID
  TEAM_TYPE_ID=$(curl -ks -XGET -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" https://$FLOWFUSE_URL/api/v1/team-types/ | jq -r --arg TYPE "$TEAM_TYPE_SELECTOR" '.types[] | select(.name==$TYPE) | .id')
  echo "Creating $TEAM_NAME team"
  curl -ks -XPOST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
    -d '{
          "name":"'"$TEAM_NAME"'",
          "type":"'"$TEAM_TYPE_ID"'"
        }' https://$FLOWFUSE_URL/api/v1/teams/
}

get_team_id() {
  local TEAM_NAME=$1
  local TEAM_ID
  TEAM_ID=$(curl -ks -XGET -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" https://$FLOWFUSE_URL/api/v1/teams | jq -r --arg NAME "$TEAM_NAME" '.teams[] | select(.name==$NAME) | .id')
  echo "$TEAM_ID"
}

create_suspended_instance() {
  local INSTANCE_NAME=$1
  local TEAM_APPLICATION_ID=$2
  echo "Creating suspended $INSTANCE_NAME@$TEAM_APPLICATION_ID instance"
  INSTANCE_ID=$(curl -ks -XPOST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
  -d '{
        "name": "'"$INSTANCE_NAME"'",
        "applicationId": "'"$TEAM_APPLICATION_ID"'",
        "projectType": "'"$projectTypeId"'",
        "stack": "'"$stackId"'",
        "template": "'"$templateId"'"
      }' https://$FLOWFUSE_URL/api/v1/projects/ | jq -r '.id')
  sleep 5
  curl -ks -XPOST \
    -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
    https://$FLOWFUSE_URL/api/v1/projects/$INSTANCE_ID/actions/suspend
}

create_device() {
  local DEVICE_NAME=$1
  local DEVICE_TYPE=$2
  local TEAM_NAME=$3
  TEAM_ID=$(get_team_id "${TEAM_NAME}")
  echo "Creating $DEVICE_NAME@$TEAM_ID device"
  curl -ks -XPOST \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
    -d '{
      "name": "'"$DEVICE_NAME"'",
      "type": "'"$DEVICE_TYPE"'",
      "team": "'"$TEAM_ID"'"
      }' https://$FLOWFUSE_URL/api/v1/devices/

}

DBPASSWORD=$(kubectl --namespace "pr-$PR_NUMBER" get secret flowfuse-pr-$PR_NUMBER-postgresql -o jsonpath='{.data.password}' | base64 -d)
kubectl run flowfuse-setup-0 \
  --namespace "pr-$PR_NUMBER" \
  -it --rm \
  --restart=Never \
  --env="PGPASSWORD=$DBPASSWORD" \
  --image bitnami/postgresql:14.10.0-debian-11-r3 \
  -- psql -h flowfuse-pr-$PR_NUMBER-postgresql -U forge -d flowforge -c \
  "INSERT INTO public.\"Users\" (username,name,email,email_verified,sso_enabled,mfa_enabled,\"password\",password_expired,\"admin\",avatar,tcs_accepted,suspended,\"createdAt\",\"updatedAt\",\"defaultTeamId\") \
    VALUES ('flowfusedeveloper','flowfusedeveloper','noreply@flowfuse.dev',true,false,false,'$INIT_CONFIG_PASSWORD_HASH',false,true,'/avatar/Zmxvd2Z1c2VkZXZlbG9wZXI',NULL,false,'2024-03-15 19:51:49.449+01','2024-03-15 19:51:49.449+01',NULL);"
kubectl run flowfuse-setup-1 \
  --namespace "pr-$PR_NUMBER" \
  -it --rm \
  --restart=Never \
  --env="PGPASSWORD=$DBPASSWORD" \
  --image bitnami/postgresql:14.10.0-debian-11-r3 \
  -- psql -h flowfuse-pr-$PR_NUMBER-postgresql -U forge -d flowforge -c \
  "INSERT INTO public.\"PlatformSettings\" (\"key\",value,\"valueType\",\"createdAt\",\"updatedAt\")\
    VALUES ('setup:initialised','true',1,'2024-03-15 19:51:52.287','2024-03-15 19:51:52.287')"
kubectl run flowfuse-setup-2 \
  --namespace "pr-$PR_NUMBER" \
  -it --rm \
  --restart=Never \
  --env="PGPASSWORD=$DBPASSWORD" \
  --image bitnami/postgresql:14.10.0-debian-11-r3 \
  -- psql -h flowfuse-pr-$PR_NUMBER-postgresql -U forge -d flowforge -c \
  "INSERT INTO public.\"AccessTokens\" (token,\"expiresAt\",scope,\"ownerId\",\"ownerType\",\"refreshToken\",name,\"createdAt\",\"updatedAt\") \
    VALUES ('$INIT_CONFIG_ACCESS_TOKEN_HASH',NULL,'','1','user',NULL,'setup','2024-03-18 10:46:54.055+01','2024-03-18 10:46:54.055+01');"

### Create project type
echo "Creating project type"
curl -ks -XPOST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
  -d '{"name":"Default", "description":"DefaultInstanceType","active": true}' \
  https://$FLOWFUSE_URL/api/v1/project-types/

### Create stack
echo "Creating stack"
projectTypeId=$(curl -ks -XGET -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" https://$FLOWFUSE_URL/api/v1/project-types/ | jq -r '.types[].id')
curl -ks -XPOST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
  -d '{"name":"Default","label":"Default", "projectType":"'"$projectTypeId"'","properties":{ "cpu":10,"memory":256,"container":"flowfuse/node-red"}}' \
  https://$FLOWFUSE_URL/api/v1/stacks/

### Link stack to project type
echo "Linking stack to project type"
stackId=$(curl -ks -XGET -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" https://$FLOWFUSE_URL/api/v1/stacks/ | jq -r '.stacks[].id')
curl -ks -XPUT \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
  -d '{"properties":{"instances":{"'"$stackId"'":{"active":true}}}}' \
  https://$FLOWFUSE_URL/api/v1/project-types/$projectTypeId

### Delete default team type
echo "Removing default team type"
defaultTeamTypeId=$(curl -ks -XGET -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" https://$FLOWFUSE_URL/api/v1/team-types/ | jq -r '.types[] | select(.name=="starter") | .id')
curl -ks -XDELETE -H "Content-Type: application/json" -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" https://$FLOWFUSE_URL/api/v1/team-types/$defaultTeamTypeId

### Create Starter team type
echo "Creating Starter team type"
curl -ks -XPOST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
  -d '{
    "name": "Starter",
    "description": "Starter type",
    "active": true,
    "properties": {
                  "users": {
                      "limit": 5
                  },
                  "devices": {
                      "limit": 10
                  },
                  "features": {
                      "shared-library": false,
                      "projectComms": false,
                      "ha": false,
                      "teamHttpSecurity": false,
                      "customCatalogs": false,
                      "deviceGroups": false,
                      "emailAlerts": false,
                      "protectedInstance": false,
                      "deviceAutoSnapshot": false,
                      "instanceAutoSnapshot": false,
                      "editorLimits": false,
                      "fileStorageLimit": null,
                      "contextLimit": null
                  },
                  "instances": {
                      "'"$projectTypeId"'": {
                          "active": true
                      }
                  }
              },
    "order": 0
  }' https://$FLOWFUSE_URL/api/v1/team-types

### Create Team team type
echo "Creating Team team type"
curl -ks -XPOST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
-d '{
      "name": "Team",
      "description": "Team type",
      "active": true,
      "properties": {
                    "users": {
                        "limit": 5
                    },
                    "devices": {
                        "limit": 10
                    },
                    "features": {
                        "shared-library": true,
                        "projectComms": true,
                        "ha": true,
                        "teamHttpSecurity": true,
                        "customCatalogs": true,
                        "deviceGroups": true,
                        "emailAlerts": true,
                        "protectedInstance": true,
                        "deviceAutoSnapshot": true,
                        "instanceAutoSnapshot": true,
                        "editorLimits": true,
                        "fileStorageLimit": null,
                        "contextLimit": null
                    },
                    "instances": {
                        "'"$projectTypeId"'": {
                            "active": true
                        }
                    }
                },
      "order": 1
    }' https://$FLOWFUSE_URL/api/v1/team-types

### Create Enterprise team type
echo "Creating Enterprise team type"
curl -ks -XPOST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
-d '{
      "name": "Enterprise",
      "description": "Enterprise type",
      "active": true,
      "properties": {
                    "users": {
                        "limit": 5
                    },
                    "devices": {
                        "limit": 10
                    },
                    "features": {
                        "shared-library": true,
                        "projectComms": true,
                        "ha": true,
                        "teamHttpSecurity": true,
                        "customCatalogs": true,
                        "deviceGroups": true,
                        "emailAlerts": true,
                        "protectedInstance": true,
                        "deviceAutoSnapshot": true,
                        "instanceAutoSnapshot": true,
                        "editorLimits": true,
                        "fileStorageLimit": null,
                        "contextLimit": null
                    },
                    "instances": {
                        "'"$projectTypeId"'": {
                            "active": true
                        }
                    }
                },
      "order": 2
    }' https://$FLOWFUSE_URL/api/v1/team-types

### Create template
echo "Creating template"
templateId=$(curl -ks -XPOST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN" \
  -d '{"name":"initial-template", "active":true, "settings":{"disableEditor":false,"disableTours":false,"httpAdminRoot":"","dashboardUI":"/ui","codeEditor":"monaco","theme":"forge-light","page":{"title":"FlowFuse","favicon":""},"header":{"title":"FlowFuse","url":""},"timeZone":"UTC","palette":{"allowInstall":true,"nodesExcludes":"","denyList":"","modules":[],"catalogue":["https://catalogue.nodered.org/catalogue.json"],"npmrc":""},"modules":{"allowInstall":true,"denyList":""},"httpNodeAuth":{"type":"","user":"","pass":""},"emailAlerts":{"crash":false,"safe":false,"recipients":"owners"}}, "policy":{"disableEditor":true,"disableTours":true,"httpAdminRoot":true,"dashboardUI":true,"codeEditor":true,"theme":true,"page":{"title":false,"favicon":false},"header":{"title":true,"url":false},"timeZone":true,"palette":{"allowInstall":true,"nodesExcludes":false,"denyList":false,"modules":true,"catalogue":true,"npmrc":true},"modules":{"allowInstall":true,"denyList":false},"httpNodeAuth":{"type":true,"user":true,"pass":true},"emailAlerts":{"crash":true,"safe":true,"recipients":true}}}' \
  https://$FLOWFUSE_URL/api/v1/templates/ | jq -r '.id')

### Create teams
create_team "Starter" "Plant Starter"
create_team "Team" "Plant Team"
create_team "Enterprise" "Plant Enterprise"


### Create Starter Team Application
echo "Creating Starter Team Application"
starterTeamId=$(get_team_id "Plant Starter")
starterTeamApplicationId=$(curl -ks -XPOST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN"  \
  -d '{
        "name": "Acme Plant",
        "description": "Acme Plant Starter Application",
        "teamId": "'"$starterTeamId"'"
      }' https://$FLOWFUSE_URL/api/v1/applications | jq -r '.id')

### Create Team Team Application
echo "Creating Team Team Application"
teamTeamId=$(get_team_id "Plant Team")
teamTeamApplicationId=$(curl -ks -XPOST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN"  \
  -d '{
        "name": "Acme Plant",
        "description": "Acme Plant Team Application",
        "teamId": "'"$teamTeamId"'"
      }' https://$FLOWFUSE_URL/api/v1/applications | jq -r '.id')

### Create Enterprise Team Application
echo "Creating Enterprise Team Application"
enterpriseTeamId=$(get_team_id "Plant Enterprise")
enterpriseTeamApplicationId=$(curl -ks -XPOST \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $INIT_CONFIG_ACCESS_TOKEN"  \
  -d '{
        "name": "Acme Plant",
        "description": "Acme Plant Enterprise Application",
        "teamId": "'"$enterpriseTeamId"'"
      }' https://$FLOWFUSE_URL/api/v1/applications/ | jq -r '.id')

### Create devices
create_device "OP1" "RPI HMI" "Plant Starter"
create_device "OP2" "RPI HMI" "Plant Starter"
create_device "Machine 1" "V1" "Plant Starter"
create_device "Machine 2" "V2" "Plant Starter"
create_device "OP1" "RPI HMI" "Plant Team"
create_device "OP2" "RPI HMI" "Plant Team"
create_device "Machine 1" "V1" "Plant Team"
create_device "Machine 2" "V2" "Plant Team"
create_device "OP1" "RPI HMI" "Plant Enterprise"
create_device "OP2" "RPI HMI" "Plant Enterprise"
create_device "Machine 1" "V1" "Plant Enterprise"
create_device "Machine 2" "V2" "Plant Enterprise"


### Create instances
create_suspended_instance "plant-live-00" $starterTeamApplicationId
create_suspended_instance "plant-develop-00" $starterTeamApplicationId
create_suspended_instance "plant-live-01" $teamTeamApplicationId
create_suspended_instance "plant-develop-01" $teamTeamApplicationId
create_suspended_instance "plant-live-02" $enterpriseTeamApplicationId
create_suspended_instance "plant-develop-02" $enterpriseTeamApplicationId

### Create users
create_user "member" "${INIT_CONFIG_PASSWORD}"
create_user "viewer" "${INIT_CONFIG_PASSWORD}"

### Assign users to teams
kubectl run flowfuse-setup-4 \
  --namespace "pr-$PR_NUMBER" \
  -it --rm \
  --restart=Never \
  --env="PGPASSWORD=$DBPASSWORD" \
  --image bitnami/postgresql:14.10.0-debian-11-r3 \
  -- psql -h flowfuse-pr-$PR_NUMBER-postgresql -U forge -d flowforge -c \
  "INSERT INTO public.\"TeamMembers\" (\"role\",\"UserId\",\"TeamId\")\
    VALUES 
      (30, 2, 1),
      (30, 2, 2),
      (30, 2, 3),
      (10, 3, 1),
      (10, 3, 2),
      (10, 3, 3);"

### Restart flowforge deployment
kubectl --namespace "pr-$PR_NUMBER" rollout restart deployment flowforge
kubectl --namespace "pr-$PR_NUMBER" rollout status deployment flowforge
