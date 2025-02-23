// Wait until html has been parsed and DOM created before trying to connect to stuff
document.addEventListener('DOMContentLoaded', () => {
 const loginButton = document.getElementById('login');
 const logoutButton = document.getElementById('logout');
 const callApiButton = document.getElementById('call-api');
 const resultDiv = document.getElementById('result');

 // For same origin, call the /login endpoint. This will redirect to Auth0
 loginButton.addEventListener('click', () => {
  window.location.href = '/login';
 });

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
   if (!response.ok) {
    throw new Error(await response.text()); // throw new Error(`Error: ${response.statusText}`);
   }

   const data = await response.json(); // I return the tokens just to show them and decode for a look-see
   renderTokens(data)                  // Write the tikens to the page
  } catch (err) {
   resultDiv.textContent = err.message;
  }
 });


 // On browser refresh, check if authenticated to initialise the page
 // If logged in, returns all profile data and sets appropriate buttons
 const checkAuth = async () => {
  try {
   const response = await fetch('/profile', {
    credentials: 'same-origin'
   });
   if (response.ok) {
    loginButton.style.display = 'none';    // Logged in so hide login button
    logoutButton.style.display = 'block';  // Show logout
    callApiButton.style.display = 'block'; // Show call moderator
    const data = await response.json()     // Returns lots of data about the user based on the scope values
    console.log('Response: ', data)        // Output in the browser console for info
    renderData(data)                       // Format and write the data to the page
   } else {
    loginButton.style.display = 'block';   // Not logged in so just show login button
    logoutButton.style.display = 'none';
    callApiButton.style.display = 'none';
   }
  } catch (err) {
   loginButton.style.display = 'block';    // If error, go to login state
   logoutButton.style.display = 'none';
   callApiButton.style.display = 'none';
  }
 };

 checkAuth(); // Run once DOM is built
});


// Render the profile data in a readable form
function renderData(data) {
 // Needed to load the picture seperately as it hadn't always downloaded by the time the html was rendered
 // so was intermittent. This makes sure it's loaded. Use its own div or the delay would render it after the text
 // if using the results div
 const img = new Image();
 img.src = data.picture;
 img.onload = function () {
  document.getElementById('photo').innerHTML = `<img class="photo" src="${data.picture}" alt="Logged-in user photo">`
 }

 const anonimisedEmail = data.email ? `user@${data.email.split('@')[1]}` : `Not available`
 const html = `<p>
 <b>Name:</b> ${data.name}<br>
 <b>Given Name:</b> ${data.given_name}<br>
 <b>Family Name:</b> ${data.family_name}<br>
 <b>Roles:</b> ${data['https://myapp.example.com/roles']}<br>
 <b>Email:</b> ${anonimisedEmail} ${data.email_verified ? '(verified)' : '(Not verified)'}<br>
 <b>Nickname:</b> User nickname. Typically start of email<br>
 <b>Updated at:</b> ${formatDate(data.updated_at)}<br>
 <b>sid:</b> (session id) ${data.sid}<br>
 <b>sub:</b> (subject) ${data.sub}<br>
 </p>` // Subject is a unique id across different systems
 document.getElementById('result').innerHTML = html
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
 const html = `<p>${data.message}<p>
 <label><b>ID Token:</label><br>
 <textarea rows="20" cols="80">${data.idToken}</textarea><br><br>

 <label><b>Access Token (type=${data.accessToken.token_type}). <br>Expires in ${formatSeconds(data.accessToken.expires_in)}:</label><br>
 <textarea rows="20" cols="80">${data.accessToken.access_token}</textarea>
 `
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