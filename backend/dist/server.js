"use strict";
/**
 * Local server entry: loads env, checks DB, starts Express.
 * For Vercel, the serverless entry is app.ts (default export).
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = __importDefault(require("./config/database"));
const chat_database_1 = require("./config/chat-database");
dotenv_1.default.config();
process.on('SIGTERM', async () => {
    await Promise.all([database_1.default.end(), (0, chat_database_1.closeChatDb)()]);
    process.exit(0);
});
const PORT = process.env.PORT || 3001;
database_1.default
    .query('SELECT NOW()')
    .then(async () => {
    const { default: app } = await Promise.resolve().then(() => __importStar(require('./app')));
    app.listen(PORT);
})
    .catch((err) => {
    console.error('❌ Failed to connect to database:', err);
    console.error('Check your DATABASE_URL in .env file');
    process.exit(1);
});
//# sourceMappingURL=server.js.map