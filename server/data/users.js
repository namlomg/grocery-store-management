const bcrypt = require('bcryptjs');

const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: '123456',
    phone: '0900000000',
    address: '123 Admin Street',
    isAdmin: true,
    isActive: true
  },
  {
    name: 'Nhân viên 1',
    email: 'staff1@example.com',
    password: '123456',
    phone: '0911111111',
    address: '456 Staff Street',
    isAdmin: false,
    isActive: true
  },
  {
    name: 'Nhân viên 2',
    email: 'staff2@example.com',
    password: '123456',
    phone: '0922222222',
    address: '789 Staff Street',
    isAdmin: false,
    isActive: true
  }
];

// Mã hóa mật khẩu trước khi trả về
const getUsersWithHashedPasswords = async () => {
  return await Promise.all(
    users.map(async (user) => {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.password, salt);
      return {
        ...user,
        password: hashedPassword
      };
    })
  );
};

module.exports = getUsersWithHashedPasswords;
