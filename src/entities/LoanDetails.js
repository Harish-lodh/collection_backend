const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'LoanDetails',
  tableName: 'loan_details',
  columns: {
    id: {
      primary: true,
      type: 'int',
      generated: true,
    },
    loanId: {
      type: 'varchar',
      length: 64,
    },
    customerName: {
      type: 'varchar',
      length: 128,
    },
    vehicleNumber: {
      type: 'varchar',
      length: 32,
    },
    contactNumber: {
      type: 'varchar',
      length: 32,
    },
    paymentDate: {
      type: 'date',
    },
    paymentMode: {
      type: 'varchar',
      length: 32,
      nullable: true,
    },
    paymentRef: {
      type: 'varchar',
      length: 64,
      nullable: true,
    },
    collectedBy: {
      type: 'varchar',
      length: 128,
      nullable: true,
    },
    amount: {
      type: 'decimal',
      precision: 12,
      scale: 2,
    },
    amountInWords: {
      type: 'varchar',
      length: 256,
      nullable: true,
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
});
