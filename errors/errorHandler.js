const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorResponse = {
    success: false,
    message: err.message || "An unexpected error occurred",
    name: err.name || "Error",
  };

  if (err.errors) {
    errorResponse.errors = err.errors;
  }

  if (err.formData) {
    errorResponse.formData = err.formData;
  }

  res.status(statusCode).json(errorResponse);
};

module.exports = errorHandler;
