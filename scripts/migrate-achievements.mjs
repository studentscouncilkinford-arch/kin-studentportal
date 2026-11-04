import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const schema = `
CREATE TABLE IF NOT EXISTS achievements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT DEFAULT 'other' CHECK (category IN ('academic', 'sports', 'arts', 'leadership', 'other')),
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all" ON achievements;
CREATE POLICY "Allow all" ON achievements FOR ALL USING (true) WITH CHECK (true);
`;

async function run() {
  console.log('Connecting to Supabase PostgreSQL...');
  await client.connect();
  console.log('Executing achievements table migration...');
  await client.query(schema);

  // Seed sample achievements for existing students if table is empty
  const countRes = await client.query('SELECT count(*) FROM achievements');
  if (parseInt(countRes.rows[0].count, 10) === 0) {
    console.log('Seeding initial sample achievements...');
    const studentsRes = await client.query("SELECT id, name FROM users WHERE user_type = 'student' LIMIT 3");
    if (studentsRes.rows.length > 0) {
      const s1 = studentsRes.rows[0].id;
      await client.query(`
        INSERT INTO achievements (student_id, title, description, category, date) VALUES
        ($1, '1st Place in Inter-School Science Quiz', 'Won first prize representing Kinford in regional science bowl.', 'academic', CURRENT_DATE - INTERVAL '5 days'),
        ($1, 'Gold Medal in 100m Sprint', 'Annual sports day athletic track event winner.', 'sports', CURRENT_DATE - INTERVAL '12 days');
      `, [s1]);

      if (studentsRes.rows[1]) {
        const s2 = studentsRes.rows[1].id;
        await client.query(`
          INSERT INTO achievements (student_id, title, description, category, date) VALUES
          ($1, 'Best Student Artwork Showcase', 'Featured in the annual visual arts exhibition.', 'arts', CURRENT_DATE - INTERVAL '3 days');
        `, [s2]);
      }

      if (studentsRes.rows[2]) {
        const s3 = studentsRes.rows[2].id;
        await client.query(`
          INSERT INTO achievements (student_id, title, description, category, date) VALUES
          ($1, 'Student Council Vice President', 'Elected to represent junior grades in leadership council.', 'leadership', CURRENT_DATE - INTERVAL '20 days');
        `, [s3]);
      }
    }
  }

  console.log('Achievements migration completed successfully!');
  await client.end();
}

run().catch((e) => {
  console.error('Migration failed:', e);
  process.exit(1);
});
