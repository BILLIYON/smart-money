"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPool = getPool;
exports.query = query;
const pg_1 = __importDefault(require("pg"));
const config_js_1 = require("./config.js");
const { Pool } = pg_1.default;
let poolInstance = null;
function getPool() {
    if (!poolInstance) {
        const isRemote = config_js_1.config.databaseUrl.includes("supabase.com") ||
            config_js_1.config.databaseUrl.includes("pooler") ||
            config_js_1.config.databaseUrl.includes("aws-");
        poolInstance = new Pool({
            connectionString: config_js_1.config.databaseUrl,
            ssl: isRemote ? { rejectUnauthorized: false } : false,
            max: 10,
            idleTimeoutMillis: 30000,
        });
        poolInstance.on("error", (err) => {
            console.error("[PartnerService DB Pool Error]", err);
        });
    }
    return poolInstance;
}
async function query(text, params) {
    const pool = getPool();
    return pool.query(text, params);
}
