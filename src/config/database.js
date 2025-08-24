// AppDataSource.js

const { DataSource } = require('typeorm');
const LoanDetails = require('../entities/LoanDetails');
const User = require('../entities/User');
const Embifi = require('../entities/Embifi'); // This must also be an EntitySchema!
const dotenv = require('dotenv');

dotenv.config();

const AppDataSource = new DataSource({
  type: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: 3306,
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || 'Fintree@2025',
  database: process.env.DB_NAME || 'testpayments',
  synchronize: true,
  logging: false,
  entities: [LoanDetails, User, Embifi],
  migrations: [],
  subscribers: [],
});

module.exports = AppDataSource;
