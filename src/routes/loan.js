import { Router } from 'express';
import AppDataSource from '../config/database.js';
import  LoanDetails  from '../entities/LoanDetails.js';
import { authenticateToken } from '../middleware/auth.js';
import { normalizeToSqlDate } from '../utils/dateUtils.js';

const router = Router();
const loanRepository = AppDataSource.getRepository(LoanDetails);

router.get('/loans', authenticateToken, async (_req, res) => {
  try {
    const loans = await loanRepository.find({
      order: { id: 'DESC' },
      take: 20,
    });
    res.json(loans);
  } catch (err) {
    console.error('Error in /loans:', err);
    res.status(500).json({ message: 'Error fetching loans' });
  }
});

router.post('/save-loan', authenticateToken, async (req, res) => {
  try {
    const {
      loanId,
      customerName,
      vehicleNumber,
      contactNumber,
      paymentDate,
      paymentMode,
      paymentRef,
      collectedBy,
      amount,
      amountInWords,
    } = req.body;

    if (!loanId || !customerName || !vehicleNumber || !contactNumber || !paymentDate || !amount) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const sqlDate = normalizeToSqlDate(paymentDate);
    if (!sqlDate) {
      return res.status(400).json({ message: 'Invalid paymentDate format. Use YYYY-MM-DD.' });
    }

    const amountNum = Number(amount);
    if (isNaN(amountNum)) {
      return res.status(400).json({ message: 'Amount must be a number' });
    }

    const loan = loanRepository.create({
      loanId: String(loanId).trim(),
      customerName: String(customerName).trim(),
      vehicleNumber: String(vehicleNumber).trim(),
      contactNumber: String(contactNumber).trim(),
      paymentDate: sqlDate,
      paymentMode: paymentMode ? String(paymentMode).trim() : null,
      paymentRef: paymentRef ? String(paymentRef).trim() : null,
      collectedBy: collectedBy ? String(collectedBy).trim() : null,
      amount: amountNum,
      amountInWords: amountInWords ? String(amountInWords).trim() : null,
    });

    const result = await loanRepository.save(loan);
    return res.status(200).json({ message: 'Loan details saved successfully', insertId: result.id });
  } catch (err) {
    console.error('Error in /save-loan:', err);
    return res.status(500).json({
      message: 'Error saving loan details',
      code: err.code,
      sqlMessage: err.message,
    });
  }
});

export default router;