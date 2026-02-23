/**
 * Vercel serverless entry: loads env (via platform on Vercel) and exports Express app.
 * All routes are rewritten to this handler (see vercel.json).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = require('../dist/app').default;
module.exports = app;
