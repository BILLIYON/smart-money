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
      cwd: "/home/ec2-user/smart-money",
      instances: 2,
      exec_mode: "cluster",
      max_memory_restart: "500M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        LOCAL_DB_URL: "http://127.0.0.1:3001"
      }
    }
  ]
};
