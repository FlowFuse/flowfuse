# User Login Flows

This represents the login flow as of FlowForge 1.2, that incorporates optional
SSO

```mermaid
sequenceDiagram
participant U as User
participant B as Browser
participant RT as ForgeApp
participant DB as Database
participant IDP as IdentifyProvider
U->>B: Enters email on sign-up page
U->>B: Clicks login
B->>RT: POST /account/login (username=XYZ)
RT->DB: Checks username/email against list of SSO registered domains
alt Email not SSO enabled
    RT->>B: 403:{ code: 'password_required' }
    B->>U: Shows password box
    U->>B: Enters password
    U->>B: Clicks login
    B->>RT: POST /account/login (username/password)
    RT->>DB: Validates username/password
    RT->>B: 200:{}
end

alt Email SSO enabled
    RT->>B: 403:{ code:'sso_required', redirect:'/account/login/sso?u=<base64 encoded email>' }
    B->>RT: GET /account/login/sso?u=<base64 encoded email>
    RT->>RT: passport.authenticate
    RT->>IDP: SAML exchange
    IDP->>IDP: User authentication
    IDP->>RT: POST <TBD>
    RT->>DB: Verify Email against users
    alt Valid User
    RT->>DB: create session
    RT->>B: redirect to /
    else Unknown User
    RT->>B: redirect to /
    end
end
```