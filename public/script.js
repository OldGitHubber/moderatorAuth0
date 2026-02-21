

// Wait until html has been parsed and DOM created before trying to connect to stuff
document.addEventListener('DOMContentLoaded', () => {
//  const loginButton = document.getElementById('login');
  const logoutButton = document.getElementById('logout');
  const callApiButton = document.getElementById('call-api');
  const resultDiv = document.getElementById('result');

  // For same origin, call the /login endpoint. This will redirect to Auth0
  // loginButton.addEventListener('click', () => {
  //   window.location.href = '/login';
  // });

  // For same origin, call the /logout endpoint. This will redirect to Auth0
  logoutButton.addEventListener('click', () => {
    window.location.href = '/logout';
  });


  // Add event listener to the call moderator button
  // Call the moderator endpoint
  // This will retrieve and display tokens if authorised
  // Or display not authorised message
  callApiButton.addEventListener('click', async () => {
    try {
      const response = await fetch('/moderator', {
        credentials: 'same-origin'
      });
      if (response.status == 403) {          // 403 Forbidden. Output the returned message
        const data = await response.json();
        renderForbidden(data)                // Only contains failure message
      } else {
        const data = await response.json(); // I return the tokens and data within them if moderator authorised
        renderTokens(data)                  // Write the tokens etc to the page
      }
    } catch (err) {
      resultDiv.textContent = err.message;
    }
  });


  // On browser refresh, fetch /profile. 
  // OIDS contacts Auth0 to check if the user has an authenticated session. If so, show the home page
  // // and their profile returned fro Auth0
  // If not, contact Auth0 for the login page
  // Based on logged in state, appropriate buttons are displayed
  const checkAuth = async () => {
    try {
      const response = await fetch('/profile', {
        credentials: 'same-origin'
      });
      if (response.ok) {
    //    loginButton.style.display = 'none';    // Logged in so hide login button
        logoutButton.style.display = 'block';  // Show logout
        callApiButton.style.display = 'block'; // Show call moderator
        const data = await response.json()     // Returns lots of data about the user based on the scope values
        console.log('Response: ', data)        // Output in the browser console for info
        renderData(data)                       // Format and write the data to the page
      }
      // } else {
      //   loginButton.style.display = 'block';   // Not logged in so just show login button
      //   logoutButton.style.display = 'none';
      //   callApiButton.style.display = 'none';
      // }
    } catch (err) {
    //  loginButton.style.display = 'block';    // If error, go to login state
      logoutButton.style.display = 'none';
      callApiButton.style.display = 'none';
    }
  };

  checkAuth(); // Run once DOM is built
});


// Render the profile data in a readable form
function renderData(data) {
  //const anonimisedEmail = data.userDetails.email ? `user@${data.userDetails.email.split('@')[1]}` : `Not available`
  const email = data.userDetails.email || `Not available`
  const html = `<p>
    <span style="color:blue"><b>Role:</b> ${data.role}<br></span>
    <b>Name:</b> ${data.userDetails.name}<br>
    <b>Given Name:</b> ${data.userDetails.given_name}<br>
    <b>Family Name:</b> ${data.userDetails.family_name}<br>
    <b>Email:</b> ${email} ${data.email_verified ? '(verified)' : '(Not verified)'}<br>
    <b>Nickname:</b> User nickname. Typically start of email<br>
    <b>Updated at:</b> ${formatDate(data.userDetails.updated_at)}<br>
    <b>sid:</b> (session id) ${data.userDetails.sid}<br>
    <b>sub:</b> (subject) ${data.userDetails.sub}<br>
    </p>` // Subject is a unique id across different systems
  document.getElementById('result').innerHTML = html

  const img = document.createElement('img');
  img.referrerPolicy = "no-referrer" // Do this before img.src. Overcomes Googles security policy which makes images intermittent
  img.src = data.userDetails.picture;
  document.getElementById('photo').appendChild(img);
}

// Date and time is stored in ISO format so format it for readability
function formatDate(isoDate) {
  const date = new Date(isoDate);

  // Options for formatting the date - e.g. '2025-02-23T14:04:52.473Z'
  const options = {
    weekday: 'long',      // "Sunday"
    year: 'numeric',      // "2025"
    month: 'long',        // "February"
    day: 'numeric',       // "23"
    hour: '2-digit',      // "02"
    minute: '2-digit',    // "04"
    second: '2-digit',    // "52"
    timeZoneName: 'short' // "GMT"
  };

  return date.toLocaleDateString('en-GB', options) // Convert to a readable format
}

// Write the ID and access tokens to two text areas
function renderTokens(data) {
  const html = `<p class="access-approved">${data.message}<p>
 <label><b>ID Token:</b></label><br>
 <textarea rows="20" cols="80">${data.idToken}</textarea><br><br>

 <label><br><b>Access Token</b> (type=${data.accessToken.token_type}).<br>
 <b>Roles: </b>${data.roles}<br>
 <b>Permissions: </b>${data.permissions}<br>
 <b>Expires in: </b>${formatSeconds(data.accessToken.expires_in)}:</label><br><br>
 <textarea rows="20" cols="80">${data.accessToken.access_token}</textarea>
 `
  document.getElementById('result').innerHTML = html
}

function renderForbidden(data) {
  const html = `<p class="access-forbidden">${data.message}</p>`
  document.getElementById('result').innerHTML = html
}

// Token expiry is in seconds so format into a readable form
function formatSeconds(seconds) {
  const days = Math.floor(seconds / (24 * 3600));
  seconds %= (24 * 3600);
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  return `${days} day(s), ${hours} hour(s), ${minutes} minute(s), and ${seconds} second(s)`;
}