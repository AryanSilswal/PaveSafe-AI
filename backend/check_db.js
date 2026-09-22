
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.query('SELECT * FROM hazards ORDER BY id DESC LIMIT 2').then(res => {
  console.log(res.rows);
  process.exit();
}).catch(e => {
  console.error(e);
  process.exit(1);
});

