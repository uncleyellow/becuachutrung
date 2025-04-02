# Sử dụng Node.js 18 Alpine (nhẹ và nhanh)
FROM node:18-alpine

# Đặt thư mục làm việc trong container
WORKDIR /app

# Copy package.json và package-lock.json trước để tối ưu layer cache
COPY package*.json ./

# Cài đặt dependencies với --production để giảm kích thước ảnh Docker (nếu chỉ chạy server)
RUN npm install --only=production

# Copy toàn bộ source code vào container
COPY . .

# Biên dịch TypeScript (nếu đang sử dụng TypeScript)
RUN npm run build

# Mở cổng ứng dụng (nếu cần)
EXPOSE 3000

# Khởi chạy ứng dụng từ dist
CMD ["node", "dist/server.js"]
