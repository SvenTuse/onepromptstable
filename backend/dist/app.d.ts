/**
 * Express application (used by server.ts for local run and by Vercel serverless).
 * Export default for Vercel; server.ts imports and calls app.listen() for local dev.
 */
declare const app: import("express-serve-static-core").Express;
export default app;
//# sourceMappingURL=app.d.ts.map