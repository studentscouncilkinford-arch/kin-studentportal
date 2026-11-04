import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const schema = `
-- 1. Add plain_password column to users table if not exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS plain_password TEXT;

-- Update existing sample users with default plain_password
UPDATE users SET plain_password = 'Kinford2026' WHERE plain_password IS NULL;

-- 2. Drop and recreate results table for program prizes
DROP TABLE IF EXISTS results CASCADE;

CREATE TABLE results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  program_name TEXT NOT NULL,
  prize TEXT NOT NULL CHECK (prize IN ('1st Prize', '2nd Prize', '3rd Prize', 'Participation', 'Special Mention', 'Best Performance')),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON results;
CREATE POLICY "Allow all" ON results FOR ALL USING (true) WITH CHECK (true);
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Applying V3 schema migration (plain_password + program prizes results)...');
  await client.query(schema);

  // Seed sample program prizes
  const studentsRes = await client.query("SELECT id, name FROM users WHERE user_type = 'student' LIMIT 3");
  if (studentsRes.rows.length > 0) {
    const s1 = studentsRes.rows[0].id;
    await client.query(`
      INSERT INTO results (student_id, program_name, prize, date) VALUES
      ($1, 'Kinford Annual Business Quiz', '1st Prize', CURRENT_DATE - INTERVAL '2 days'),
      ($1, 'Science Exhibition 2026', 'Best Performance', CURRENT_DATE - INTERVAL '10 days');
    `, [s1]);

    if (studentsRes.rows[1]) {
      const s2 = studentsRes.rows[1].id;
      await client.query(`
        INSERT INTO results (student_id, program_name, prize, date) VALUES
        ($1, 'Fine Arts Festival - Watercolors', '2nd Prize', CURRENT_DATE - INTERVAL '4 days');
      `, [s2]);
    }

    if (studentsRes.rows[2]) {
      const s3 = studentsRes.rows[2].id;
      await client.query(`
        INSERT INTO results (student_id, program_name, prize, date) VALUES
        ($1, 'Inter-School Debate Championship', 'Special Mention', CURRENT_DATE - INTERVAL '7 days'),
        ($1, 'Robotics Showcase', 'Participation', CURRENT_DATE - INTERVAL '15 days');
      `, [s3]);
    }
  }

  console.log('V3 Migration and seeding completed successfully!');
  await client.end();
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
