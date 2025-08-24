import { Router } from 'express';
import  AppDataSource from '../config/database.js';

const router = Router();

router.get('/user-data', async (req, res) => {
  const { loanId, customerName } = req.query;

  if (!loanId && !customerName) {
    return res.status(400).json({ error: 'Please provide either loanId or customerName.' });
  }

  if (loanId && (typeof loanId !== 'string' || loanId.length > 50)) {
    return res.status(400).json({ error: 'Invalid loanId format.' });
  }
  if (customerName && (typeof customerName !== 'string' || customerName.length > 100)) {
    return res.status(400).json({ error: 'Invalid customerName format.' });
  }

  try {
    const queryBuilder = AppDataSource.createQueryBuilder()
      .select([
        'Created At',
        'Partner Loan Id',
        'LAN',
        'Applicant Name',
        'Mobile Number',
        'PAN Number',
        'Approved Loan Amount',
        'Disbursal Amount',
        'EMI Amount',
        'Loan Tenure',
        'Intrest Rate',
        'Loan Status',
        'Loan Admin Status',
        'First EMI Date',
        'Last EMI Date',
        'Applicant Address',
        'Applicant City',
        'Applicant State',
        'Account No.',
        'IFSC Code',
      ])
      .from('embifi', 'embifi');

    if (loanId) {
      queryBuilder.andWhere('embifi.Partner Loan Id = :loanId', { loanId });
    }
    if (customerName) {
      queryBuilder.andWhere('embifi.Applicant Name LIKE :customerName', { customerName: `%${customerName}%` });
    }

    const rows = await queryBuilder.getRawMany();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No matching user found.' });
    }

    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;