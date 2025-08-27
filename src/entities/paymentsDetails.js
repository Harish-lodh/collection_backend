const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'paymentsDetails',
  tableName: 'payments_details',
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
    panNumber: {
      type: 'varchar',
      length: 64,
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
    latitude: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    longitude: {
      type: 'varchar',
      length: 256,
      nullable: false,
    },
    image: {
      type: 'longblob',
      nullable: false, 
    },
    createdAt: {
      type: 'timestamp',
      createDate: true,
    },
  },
});
