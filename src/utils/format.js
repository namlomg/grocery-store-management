/**
 * Định dạng số tiền theo định dạng VND
 * @param {number} amount - Số tiền cần định dạng
 * @param {boolean} noSymbol - Có bỏ ký hiệu tiền tệ hay không
 * @returns {string} Chuỗi đã được định dạng (ví dụ: 1.000.000 đ)
 */
export const formatCurrency = (amount, noSymbol = false) => {
  if (amount === null || amount === undefined) return noSymbol ? '0' : '0 đ';
  const formatted = amount.toLocaleString('vi-VN');
  return noSymbol ? formatted : `${formatted} đ`;
};

/**
 * Định dạng ngày tháng
 * @param {string|Date} date - Ngày cần định dạng
 * @returns {string} Chuỗi ngày tháng đã được định dạng (ví dụ: 01/01/2023)
 */
export const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('vi-VN');
};

/**
 * Rút gọn chuỗi nếu quá dài
 * @param {string} text - Chuỗi cần rút gọn
 * @param {number} maxLength - Độ dài tối đa
 * @returns {string} Chuỗi đã được rút gọn
 */
export const truncateText = (text, maxLength = 50) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
};
