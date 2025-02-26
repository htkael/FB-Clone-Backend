class CustomNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
    this.name = "NotFoundError";
  }
}

class CustomBadRequestError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
    this.name = "BadRequestError";
  }
}

class CustomUnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.statusCode = 401;
    this.name = "UnauthorizedError";
  }
}

class CustomValidationError extends Error {
  constructor(message, errors = [], formData) {
    super(message);
    this.statusCode = 422;
    this.name = "ValidationError";
    this.errors = errors;
    this.formData = formData;
  }
}

class CustomServerError extends Error {
  constructor(message = "Internal server error") {
    super(message);
    this.statusCode = 500;
    this.name = "ServerError";
  }
}

module.exports = {
  CustomNotFoundError,
  CustomBadRequestError,
  CustomServerError,
  CustomUnauthorizedError,
  CustomValidationError,
};
