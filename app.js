const express = require('express');
const path = require('path');
const { auth, requiresAuth } = require('express-openid-connect'); // Authentication, ID token validation and session cookie generation
const jwt = require('jsonwebtoken'); // Create & sign JWTs, Verify them and decode them. I use this in the check role function
const dotenv = require('dotenv');
const fs = require('fs');
const https = require('https');

dotenv.config();

const app = express();

const port = process.env.PORT
const CUSTOM_CLAIMS_NAMESPACE = process.env.CUSTOM_CLAIMS_NAMESPACE // Anything unique to avoid custom claims clashing with Auth0 defined claims
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
    scope: 'openid profile email', // Scopes for ID token and access token. openid to authenticate, profile for picture and email for email address
    prompt: 'consent select_account'       // Always ask for consent. Always ask which account as opposed to silently signing in the same one every time google for example is selected
  }
}

// Router with login, logout and callback is returned and provided to app.use to add to the middleware stack so routes are available as if defined in here
app.use(auth(config))

app.use(express.static(path.join(__dirname, 'public')));

app.get('/profile', requiresAuth(), (req, res) => {
  const userDetails = req.oidc.user
  const roles = userDetails[`${CUSTOM_CLAIMS_NAMESPACE}roles`]

  res.json({ userDetails: userDetails, role: roles[0] })   // Roles is an array as there may be more than one
});

// This protected endpoint needs a user to be authenticated, and have the appropriate access. It also
// receives the users role which needs to be administrator. 
// If the user authenticates, and is an admin with admin:stuff permissions, let them in.
// requiresAuth is OIDC middleware and will deal with the authentication. This is called before this route executes
// If authentication fails, the request is terminated and response returned in middleware. If sucessful, we get into
// this callback and check the role and permissions
app.get('/moderator', requiresAuth(), (req, res) => {
  console.log(`In moderator!`)

  const accessToken = req.oidc.accessToken && req.oidc.accessToken.access_token // Remember the crummy javascript && is not logical but a selection
  const claims = accessToken ? jwt.decode(accessToken) : {}

  console.log('Decoded access token claims:', claims)

  const permissions = claims.permissions || []; // There can be multiple permissions so returns an array
  const roles = claims[`${CUSTOM_CLAIMS_NAMESPACE}roles`] || []; // claims is an array. One claim is the roles prefixed with the custom namespace added in Auth0

  if (permissions.includes('access:all') && roles.includes('moderator')) {
    res.json({
      message: 'Moderator access approved',
      idToken: req.oidc.idToken,
      accessToken: req.oidc.accessToken,
      roles: roles,
      permissions: permissions
    })
  } else

    res.status(403).json({ message: `You do not have permission to access this service.` }); // Role missing so block user and terminate middleware here

});

const httpsOptions = {
  key: fs.readFileSync('key.pem', 'utf8'),
  cert: fs.readFileSync('cert.pem', 'utf8'),
};

https.createServer(httpsOptions, app).listen(port, () => {
  console.log(`HTTPS Server is running on port ${port}`);
});