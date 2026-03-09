function validate(validator) {
  return function runValidation(req, res, next) {
    try {
      req.validated = validator(req);
      next();
    } catch (error) {
      next(error);
    }
  };
}

module.exports = {
  validate
};

