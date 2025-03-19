const express = require('express');
const path = require('path');
const { auth, requiresAuth } = require('express-openid-connect'); // Authentication, Authorisation, Session management etc for Auth0 & OIDC
const jwt = require('jsonwebtoken'); // Create & sign JWTs, Verify them and decode them. I use this in the check role function
const dotenv = require('dotenv');
const fs = require('fs');
const https = require('https');

dotenv.config();

const app = express();

const port = process.env.PORT || 3000;
const AUTH0_CLAIMS_NAMESPACE = process.env.AUTH0_ROLES_NAMESPACE // Anything unique to avoid custom claims clashing with Auth0 defined claims
const AUDIENCE = process.env.AUDIENCE  // The name of the API in Auth0 to get the tokens from. Can be anything unique but once set in Auth0 APIit can't be changed

const config = {
 authRequired: true,
 auth0Logout: true,
 secret: process.env.SECRET,
 baseURL: process.env.BASEURL,
 clientID: process.env.CLIENTID,
 issuerBaseURL: process.env.ISSUER,
 clientSecret: process.env.CLIENTSECRET,
 authorizationParams: {
  response_type: 'code',
  audience: AUDIENCE,  // API to call to get tokens
  scope: 'openid profile email read:messages', // Scopes for ID token and access token. Added read:messages to show that we dn't always get what we ask for
  //prompt: 'consent' // Always ask for consent
 }
};

// Router with login, logout and callback is returned and provided to app.use to add to the middleware stack so routes are availabe as if defined in here
// Basically does the whole of the OIDC authentication_code process
app.use(auth(config));

app.use(express.static(path.join(__dirname, 'public')));

// This is some middleware to check the role is that of moderator. The middleware function is assigned to 
// Pass in a role and see if it is in the accessToken. Return true or false
// Could use either token as I added role to both of them
const checkRole = (role) => {
 return (req, res, next) => {
  const namespace = AUTH0_CLAIMS_NAMESPACE
  const userRoles = req.oidc.user ? req.oidc.user[`${namespace}roles`] : []; // Extract the roles added to the token as claims

  // Not so easy to get role from access token so probably better using idToken. However... need to install jsonwebtoken to decode access token to use it
  const accessToken = req.oidc.accessToken
  if (accessToken) {
   const decodedToken = jwt.decode(accessToken.access_token); // Decode the access token
   const permissions = decodedToken.permissions // Have a look at permissions. Use these as well as or instead of role
   console.log('Permissions: ', permissions)
   const roles = decodedToken[`${AUTH0_CLAIMS_NAMESPACE}roles`];  // Extract roles from the decoded token
   console.log("Roles:", roles);
   req.oidc.roles = roles              // I want to pass these back so I can output them so as this is middleware, add them to 
   req.oidc.permissions = permissions  // the req object so they are passed along the middleware to the endpoint so I can send them back in the response
  }

  if (userRoles && userRoles.includes(role)) {  // Role we are looking for is there so go to next middleware. COuld check for permissions as well
   return next();
  } else {
   res.status(403).json({ message: `You do not have permission to access this service.` }); // Role missing so block user and terminate middleware here
  }
 };
};


app.get('/profile', requiresAuth(), (req, res) => {
 res.send(JSON.stringify(req.oidc.user)); // Return user profile
});

// This endpoint needs a user to be authenticated, and the moderator role is in the token
// If both functions succeed, let the user do whatever they came here to do. If either fails
// they would have been rejected by the middleware
// The roles and permissions are not in OIDC object so need soem middleware to retrieve them
app.get('/moderator', requiresAuth(), checkRole('moderator'), (req, res) => {
 console.log(`In moderator!`)
 // If we get back here, the role and permissions must be there or the middleware would have returned http response
 res.json({
  message: 'Moderator access approved',
  idToken: req.oidc.idToken,
  accessToken: req.oidc.accessToken,
  roles: req.oidc.roles,
  permissions: req.oidc.permissions
 })
});

const httpsOptions = {
 key: fs.readFileSync('key.pem'),
 cert: fs.readFileSync('cert.pem'),
};

https.createServer(httpsOptions, app).listen(port, () => {
 console.log(`HTTPS Server is running on port ${port}`);
});