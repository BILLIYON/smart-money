module.exports = {
  apps: [
    {
      name: "postgrest",
      script: "./scratch/postgrest",
      args: "./scratch/postgrest.conf",
      cwd: "/home/ec2-user/smart-money",
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT: 3001
      }
    },
    {
      name: "smart-money",
      script: "./node_modules/next/dist/bin/next",
      args: "start -H 0.0.0.0 -p 3000",
      cwd: "/home/ec2-user/smart-money/apps/web",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        LOCAL_DB_URL: "http://127.0.0.1:3001",
        PARTNER_SERVICE_URL: "http://127.0.0.1:8001"
      }
    },
    {
      name: "transaction-syncer",
      script: "main.py",
      interpreter: "./venv/bin/python3",
      cwd: "/home/ec2-user/smart-money/services/transaction_syncer",
      instances: 1,
      exec_mode: "fork",
      env: {
        PORT: 8000
      }
    },
    {
      name: "partner-service",
      script: "dist/server.js",
      cwd: "/home/ec2-user/smart-money/services/partner_service",
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "300M",
      env: {
        NODE_ENV: "production",
        PARTNER_SERVICE_PORT: 8001
      }
    }
  ]
};

