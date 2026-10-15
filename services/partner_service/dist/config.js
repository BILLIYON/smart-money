"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function loadEnvFile(filePath) {
    if (!fs_1.default.existsSync(filePath))
        return;
    const content = fs_1.default.readFileSync(filePath, "utf8");
    for (const rawLine of content.split("\n")) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#"))
            continue;
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1)
            continue;
        const key = line.substring(0, eqIdx).trim();
        let val = line.substring(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!process.env[key]) {
            process.env[key] = val;
        }
    }
}
// Check root .env.local and .env
const rootEnvLocal = path_1.default.resolve(process.cwd(), "../../.env.local");
const localEnvLocal = path_1.default.resolve(process.cwd(), ".env.local");
loadEnvFile(rootEnvLocal);
loadEnvFile(localEnvLocal);
exports.config = {
    port: parseInt(process.env.PARTNER_SERVICE_PORT || "8001", 10),
    internalKey: process.env.INTERNAL_PARTNER_KEY || process.env.ENCRYPTION_KEY || "sm_internal_partner_secret_key_2026",
    databaseUrl: process.env.DATABASE_URL || "postgresql://postgres@127.0.0.1:5432/smart_money",
    nodeEnv: process.env.NODE_ENV || "production",
};
