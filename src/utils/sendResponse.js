export const sendResponse = (res, { statusCode = 200, message = '', success = true, data = null }) => {
  res.status(statusCode).json({
    success,
    message,
    data
  });
};