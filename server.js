/////////////////////////////////////////////////////////////////////
// This module is the starting point of the http server
/////////////////////////////////////////////////////////////////////
// Author : Nicolas Chourot
// Lionel-Groulx College
/////////////////////////////////////////////////////////////////////

import APIServer from "./APIServer.js";
import RouteRegister from './routeRegister.js';

RouteRegister.add('GET', 'Bookmarks', 'list');

RouteRegister.add('GET', 'posts', 'togglelike');

RouteRegister.add('GET', 'accounts');
RouteRegister.add('GET', 'accounts', 'exists'); // Checks if a given email already exists
RouteRegister.add('POST', 'accounts', 'register'); // Signs up a user to the system
RouteRegister.add('GET', 'accounts', 'verify'); // Verifies a user to the system
RouteRegister.add('GET', 'accounts', 'logout'); // Logs out the connected user from the system
RouteRegister.add('GET', 'accounts', 'fromtoken'); // Fetches the user associated with an access token
RouteRegister.add('PUT', 'accounts', 'modify'); // Modifies a user in the system
RouteRegister.add('GET', 'accounts', 'remove'); // Removes a user in the system

RouteRegister.add('GET', 'accounts', 'conflict');
RouteRegister.add('POST', 'accounts', 'block');
RouteRegister.add('POST', 'accounts', 'promote');

let server = new APIServer();
server.start();