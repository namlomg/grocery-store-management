const orders = [
  {
    orderNumber: 'ORD-0001',
    items: [
      {
        product: 'Sữa tươi Vinamilk',
        name: 'Sữa tươi Vinamilk',
        quantity: 2,
        price: 25000,
        total: 50000
      },
      {
        product: 'Trứng gà ta',
        name: 'Trứng gà ta',
        quantity: 10,
        price: 4000,
        total: 40000
      }
    ],
    subtotal: 90000,
    discount: 0,
    total: 90000,
    customerPayment: 100000,
    change: 10000,
    paymentMethod: 'cash',
    customer: {
      name: 'Nguyễn Văn A',
      phone: '0912345678',
      address: '123 Đường ABC, Quận 1, TP.HCM'
    },
    staff: 'Nhân viên 1',
    status: 'completed',
    notes: 'Khách hàng thân thiết',
    createdAt: new Date('2024-02-15T08:30:00')
  },
  {
    orderNumber: 'ORD-0002',
    items: [
      {
        product: 'Gạo ST25',
        name: 'Gạo ST25',
        quantity: 5,
        price: 45000,
        total: 225000
      },
      {
        product: 'Nước mắm Phú Quốc',
        name: 'Nước mắm Phú Quốc',
        quantity: 1,
        price: 120000,
        total: 120000
      },
      {
        product: 'Nước suối Lavie',
        name: 'Nước suối Lavie',
        quantity: 2,
        price: 10000,
        total: 20000
      }
    ],
    subtotal: 365000,
    discount: 15000,
    total: 350000,
    customerPayment: 400000,
    change: 50000,
    paymentMethod: 'cash',
    customer: {
      name: 'Trần Thị B',
      phone: '0987654321',
      address: '456 Đường XYZ, Quận 2, TP.HCM'
    },
    staff: 'Nhân viên 2',
    status: 'completed',
    notes: 'Khách hàng mới',
    createdAt: new Date('2024-02-16T14:15:00')
  },
  {
    orderNumber: 'ORD-0003',
    items: [
      {
        product: 'Mì Hảo Hảo tôm chua cay',
        name: 'Mì Hảo Hảo tôm chua cay',
        quantity: 10,
        price: 8000,
        total: 80000
      },
      {
        product: 'Sữa đặc Ông Thọ',
        name: 'Sữa đặc Ông Thọ',
        quantity: 2,
        price: 32000,
        total: 64000
      },
      {
        product: 'Bánh mì ngọt',
        name: 'Bánh mì ngọt',
        quantity: 5,
        price: 10000,
        total: 50000
      }
    ],
    subtotal: 194000,
    discount: 0,
    total: 194000,
    customerPayment: 200000,
    change: 6000,
    paymentMethod: 'momo',
    customer: {
      name: 'Lê Văn C',
      phone: '0905123456',
      address: '789 Đường DEF, Quận 3, TP.HCM'
    },
    staff: 'Nhân viên 1',
    status: 'completed',
    notes: 'Giao hàng trước 17h',
    createdAt: new Date('2024-02-17T10:45:00')
  },
  {
    orderNumber: 'ORD-0004',
    items: [
      {
        product: 'Dầu ăn Neptune',
        name: 'Dầu ăn Neptune',
        quantity: 1,
        price: 55000,
        total: 55000
      },
      {
        product: 'Nước mắm Phú Quốc',
        name: 'Nước mắm Phú Quốc',
        quantity: 1,
        price: 120000,
        total: 120000
      }
    ],
    subtotal: 175000,
    discount: 0,
    total: 175000,
    customerPayment: 200000,
    change: 25000,
    paymentMethod: 'banking',
    customer: {
      name: 'Phạm Thị D',
      phone: '0911111111',
      address: '321 Đường GHI, Quận 4, TP.HCM'
    },
    staff: 'Nhân viên 2',
    status: 'completed',
    notes: 'Đã thanh toán qua ngân hàng',
    createdAt: new Date('2024-02-18T16:20:00')
  },
  {
    orderNumber: 'ORD-0005',
    items: [
      {
        product: 'Sữa tươi Vinamilk',
        name: 'Sữa tươi Vinamilk',
        quantity: 5,
        price: 25000,
        total: 125000
      },
      {
        product: 'Bánh mì ngọt',
        name: 'Bánh mì ngọt',
        quantity: 10,
        price: 10000,
        total: 100000
      },
      {
        product: 'Nước suối Lavie',
        name: 'Nước suối Lavie',
        quantity: 5,
        price: 10000,
        total: 50000
      }
    ],
    subtotal: 275000,
    discount: 10000,
    total: 265000,
    customerPayment: 300000,
    change: 35000,
    paymentMethod: 'cash',
    customer: {
      name: 'Vũ Văn E',
      phone: '0922222222',
      address: '159 Đường JKL, Quận 5, TP.HCM'
    },
    staff: 'Nhân viên 1',
    status: 'completed',
    notes: 'Khách hàng thân thiết',
    createdAt: new Date('2024-02-19T11:10:00')
  }
];

module.exports = orders;
