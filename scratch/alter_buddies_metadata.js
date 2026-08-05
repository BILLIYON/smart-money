const { Client } = require('pg');

async function main() {
  const password = encodeURIComponent('D$C#3RbT_%XG7a?');
  const client = new Client({ connectionString: `postgres://postgres:${password}@[2a05:d018:135e:169c:f1e4:913b:28a5:30ab]:5432/postgres` });
  
  try {
    await client.connect();
    console.log('Connected successfully');
    
    const checkRes = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='buddies' and column_name='metadata';
    `);
    
    if (checkRes.rows.length === 0) {
      console.log('Adding metadata column...');
      await client.query(`ALTER TABLE public.buddies ADD COLUMN metadata JSONB NOT NULL DEFAULT '{}'::jsonb`);
      console.log('Metadata column added successfully');
    } else {
      console.log('Metadata column already exists');
    }
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

main();
