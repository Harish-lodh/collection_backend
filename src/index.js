import 'reflect-metadata';

console.log('reflect-metadata imported');
import  AppDataSource  from './config/database.js';
import app from './app.js';
import dotenv from 'dotenv';

dotenv.config();
const port = process.env.PORT || 3000;

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log('✅ Connected to MySQL database with TypeORM!');

    app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

startServer();