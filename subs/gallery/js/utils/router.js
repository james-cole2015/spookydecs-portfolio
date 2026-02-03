/**
 * Router
 *
 * Client-side routing using Navigo
 */

import Navigo from 'https://cdn.jsdelivr.net/npm/navigo@8/+esm';

// Create router instance
const router = new Navigo('/', { hash: false });

export { router };
