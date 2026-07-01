const { Client } = require("pg");

async function main() {
  const client = new Client({
    user: "postgres.gmbwrhdoyoinkmtrtbnr",
    password: "D$C#3RbT_%XG7a?",
    host: "aws-0-eu-west-1.pooler.supabase.com",
    port: 6543,
    database: "postgres",
    ssl: { rejectUnauthorized: false }
  });

  console.log("Connecting to Supabase Postgres database...");
  await client.connect();
  console.log("Connected successfully!");

  console.log("Seeding signal sources into database...");
  await client.query(`
    INSERT INTO public.signal_sources (id, name, description, status) VALUES
      ('nairametrics', 'Nairametrics', 'Nairametrics news feed', 'active'),
      ('businessday', 'BusinessDay NG', 'BusinessDay NG news feed', 'active'),
      ('reuters', 'Reuters Finance', 'Reuters news feed', 'active'),
      ('coindesk', 'CoinDesk', 'CoinDesk news feed', 'active'),
      ('bloomberg', 'Bloomberg', 'Bloomberg news feed', 'active'),
      ('stears-podcast', 'The Stears Podcast', 'Stears podcast feed', 'active'),
      ('wedontdostocks', 'We Don''t Do Stocks', 'We Don''t Do Stocks podcast feed', 'active'),
      ('planet-money', 'Planet Money (NPR)', 'NPR Planet Money podcast feed', 'active'),
      ('invest-like-the-best', 'Invest Like the Best', 'Invest Like the Best podcast feed', 'active'),
      ('stears-weekly', 'Stears Weekly', 'Stears Weekly newsletter feed', 'active'),
      ('techcabal', 'TechCabal Daily', 'TechCabal newsletter feed', 'active'),
      ('hustle', 'The Hustle', 'The Hustle newsletter feed', 'active')
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      status = EXCLUDED.status;
  `);

  console.log("Signal sources seeded successfully!");
  await client.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
