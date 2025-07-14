# Hệ Thống Quản Lý Cửa Hàng Tạp Hóa

Ứng dụng quản lý cửa hàng tạp hóa toàn diện được xây dựng với kiến trúc MERN Stack (MongoDB, Express.js, React.js, Node.js) kết hợp với Material-UI. Ứng dụng cung cấp đầy đủ các chức năng quản lý từ hàng hóa, tồn kho, đơn hàng đến báo cáo thống kê.

## 🌟 Tính Năng Chính

### Frontend
- **Quản lý Sản phẩm**: Thêm, sửa, xóa, tìm kiếm và phân loại sản phẩm
- **Quản lý Kho**: Theo dõi số lượng tồn kho, cảnh báo hàng sắp hết
- **Quản lý Hạn sử dụng**: Cảnh báo sản phẩm sắp hết hạn
- **Bán Hàng**: Tạo và quản lý đơn hàng, hỗ trợ quét mã vạch
- **Báo cáo & Thống kê**: Thống kê doanh thu, sản phẩm bán chạy theo nhiều tiêu chí
- **Quản lý Công nợ**: Theo dõi công nợ khách hàng

### Backend (RESTful API)
- Xác thực và phân quyền người dùng
- Quản lý dữ liệu sản phẩm, danh mục
- Xử lý đơn hàng và thanh toán
- Tạo báo cáo và thống kê
- Tự động hóa cảnh báo tồn kho và hạn sử dụng

## 🛠 Công Nghệ Sử Dụng

### Frontend
- **React.js**: Thư viện JavaScript cho giao diện người dùng
- **Material-UI (MUI)**: Thư viện giao diện người dùng
- **Redux/Context API**: Quản lý trạng thái ứng dụng
- **React Router**: Điều hướng trang
- **Axios**: Xử lý HTTP requests
- **Quagga.js**: Hỗ trợ quét mã vạch
- **Chart.js**: Hiển thị biểu đồ thống kê
- **Date-fns**: Xử lý ngày tháng
- **Notistack**: Hiển thị thông báo

### Backend
- **Node.js**: Môi trường thực thi JavaScript phía server
- **Express.js**: Framework xây dựng API
- **MongoDB**: Cơ sở dữ liệu NoSQL
- **Mongoose**: ODM cho MongoDB
- **JSON Web Token (JWT)**: Xác thực người dùng
- **Bcrypt**: Mã hóa mật khẩu
- **Mongoose-paginate-v2**: Phân trang dữ liệu
- **Cors**: Hỗ trợ Cross-Origin Resource Sharing
- **Dotenv**: Quản lý biến môi trường
- **Nodemon**: Tự động khởi động lại server khi có thay đổi

## 🚀 Yêu Cầu Hệ Thống

- Node.js 14.x trở lên
- npm 6.x trở lên hoặc yarn
- MongoDB 4.4 trở lên

## 📦 Cài Đặt Thư Viện

### Frontend
Các thư viện chính đã được cài đặt tự động khi chạy `npm install` trong thư mục `src/`. Dưới đây là các thư viện chính:

```bash
# Các thư viện chính đã được cài đặt:
@emotion/react
@emotion/styled
@mui/material
@mui/icons-material
@mui/x-data-grid
@mui/x-date-pickers
react
react-dom
react-router-dom
axios
date-fns
formik
yup
chart.js
react-chartjs-2
@ericblade/quagga2
notistack
```

### Backend
Các thư viện backend đã được cài đặt tự động khi chạy `npm install` trong thư mục `server/`. Dưới đây là các thư viện chính:

```bash
# Các thư viện chính đã được cài đặt:
express
mongoose
bcryptjs
jsonwebtoken
cors
dotenv
morgan
multer
helmet
compression
mongoose-paginate-v2
```

### Cài đặt thủ công (nếu cần)
Nếu gặp lỗi thiếu thư viện, bạn có thể cài đặt thủ công:

```bash
# Frontend
cd src
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material
npm install @mui/x-data-grid @mui/x-date-pickers
npm install react-router-dom axios date-fns formik yup
npm install chart.js react-chartjs-2
npm install @ericblade/quagga2 notistack

# Backend
cd ../server
npm install express mongoose bcryptjs jsonwebtoken cors dotenv morgan
npm install multer helmet compression mongoose-paginate-v2
```

## 🛠 Cài Đặt

### 1. Clone dự án
```bash
git clone [repository-url]
cd grocery-store-management
```

### 2. Cài đặt Frontend
```bash
# Di chuyển vào thư mục frontend
cd src

# Cài đặt các dependencies
npm install
# hoặc
yarn install

# Khởi động ứng dụng (chế độ phát triển)
npm start
# hoặc
yarn start
```

### 3. Cài đặt Backend
```bash
# Quay lại thư mục gốc
cd ..

# Di chuyển vào thư mục server
cd server

# Cài đặt các dependencies
npm install
# hoặc
yarn install

# Tạo file .env từ file mẫu và cấu hình
cp .env.example .env

# Khởi động server
npm run dev
# hoặc
yarn dev
```

### 4. Cấu hình biến môi trường
Tạo file `.env` trong thư mục `server` với các biến sau:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/grocery-store
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
NODE_ENV=development
```

## 📊 Cấu Trúc Thư Mục
```
grocery-store-management/
├── src/                    # Frontend source code
│   ├── assets/            # Hình ảnh, fonts, styles
│   ├── components/        # Các component tái sử dụng
│   │   ├── layout/        # Layout chung
│   │   ├── pos/           # Bán hàng trực tiếp
│   │   ├── products/      # Quản lý sản phẩm
│   │   ├── inventory/     # Quản lý kho
│   │   ├── orders/        # Quản lý đơn hàng
│   │   └── reports/       # Báo cáo thống kê
│   ├── context/           # React context
│   ├── pages/             # Các trang của ứng dụng
│   ├── services/          # API services
│   └── utils/             # Tiện ích hỗ trợ
├── server/                # Backend source code
│   ├── config/           # Cấu hình
│   ├── controllers/      # Xử lý logic nghiệp vụ
│   ├── middleware/       # Middleware
│   ├── models/           # Database models
│   ├── routes/           # Định tuyến API
│   └── utils/            # Tiện ích hỗ trợ
└── README.md             # Tài liệu dự án
```

## 🔧 Tích Hợp Với Hệ Thống Khác
- **Thanh Toán Trực Tuyến**: Có thể tích hợp với các cổng thanh toán như VNPay, Momo
- **In Hóa Đơn**: Hỗ trợ in hóa đơn nhiệt
- **Quét Mã Vạch**: Hỗ trợ quét mã vạch từ camera hoặc đầu đọc mã vạch

## 📄 Giấy Phép
Dự án được phát triển bởi [Nam Long] 
## 🤝 Đóng Góp
Mọi đóng góp đều được chào đón! 

## 📞 Liên Hệ
- Email: vunamlong3522@gmail.com
- Website: [https://bug-team.pages.dev/]
