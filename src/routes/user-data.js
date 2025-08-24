import { Router } from 'express';
import AppDataSource from '../config/database.js';

const router = Router();

router.get('/user-data', async (req, res) => {
  const { loanId, customerName } = req.query;
  console.log(req.query)
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
        'embifi.createdAt AS createdAt',
        'embifi.partnerLoanId AS partnerLoanId',
        'embifi.lan AS lan',
        'embifi.applicantName AS applicantName',
        'embifi.mobileNumber AS mobileNumber',
        'embifi.panNumber AS panNumber',
        'embifi.approvedLoanAmount AS approvedLoanAmount',
        'embifi.disbursalAmount AS disbursalAmount',
        'embifi.emiAmount AS emiAmount',
        'embifi.loanTenure AS loanTenure',
        'embifi.interestRate AS interestRate',
        'embifi.loanStatus AS loanStatus',
        'embifi.loanAdminStatus AS loanAdminStatus',
        'embifi.firstEmiDate AS firstEmiDate',
        'embifi.lastEmiDate AS lastEmiDate',
        'embifi.applicantAddress AS applicantAddress',
        'embifi.applicantCity AS applicantCity',
        'embifi.applicantState AS applicantState',
        'embifi.accountNo AS accountNo',
        'embifi.ifscCode AS ifscCode'
      ])

      .from('embifi', 'embifi');

    if (loanId) {
      queryBuilder.andWhere('embifi.partnerLoanId = :loanId', { loanId });
    }
    if (customerName) {
      queryBuilder.andWhere('embifi.applicantName LIKE :customerName', { customerName: `%${customerName}%` });
    }

    const rows = await queryBuilder.getRawMany();

    if (rows.length === 0) {
      return res.status(404).json({ message: 'No matching user found.' });
    }
    console.log(rows)
    return res.json({ data: rows });
  } catch (error) {
    console.error('DB error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;