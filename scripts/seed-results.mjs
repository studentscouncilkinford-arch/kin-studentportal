import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:TsKSCkinfEODUD@db.erpldcmiqeffqcjacxzr.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  await client.connect();
  const students = await client.query('SELECT id FROM students');
  const results = await client.query('SELECT count(*) FROM results');
  
  if (parseInt(results.rows[0].count, 10) === 0 && students.rows.length > 0) {
    for (let i = 0; i < students.rows.length; i++) {
      const sId = students.rows[i].id;
      await client.query(
        'INSERT INTO results (student_id, subject, score, grade, date) VALUES ($1::uuid, $2, $3, $4, CURRENT_DATE)',
        [sId, i === 0 ? 'Mathematics' : 'English Literature', i === 0 ? 94.5 : 88.0, i === 0 ? 'A+' : 'A']
      );
    }
    console.log('Sample results created.');
  }
  await client.end();
}

run().catch(console.error);
