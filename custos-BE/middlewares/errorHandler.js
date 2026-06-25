function errorHandler(error, _req, res, _next) {
  console.error(error);

  // Multer errors
  if (error.name === "MulterError") {
    const messages = {
      LIMIT_FILE_SIZE: "File is too large. Maximum size is 10 MB.",
      LIMIT_UNEXPECTED_FILE: "Unexpected file field.",
    };
    return res.status(400).json({
      success: false,
      message: messages[error.code] || error.message,
    });
  }

  // Sequelize errors
  if (error.name === "SequelizeValidationError") {
    return res.status(400).json({
      success: false,
      message: error.errors.map((e) => e.message).join(", "),
    });
  }

  if (error.name === "SequelizeUniqueConstraintError") {
    return res.status(409).json({
      success: false,
      message: "A record with that value already exists.",
    });
  }

  if (error.name === "SequelizeForeignKeyConstraintError") {
    return res.status(400).json({
      success: false,
      message: "Invalid reference: related record does not exist.",
    });
  }

  if (error.name === "SequelizeDatabaseError") {
    return res.status(400).json({
      success: false,
      message: "Database error: " + error.message,
    });
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || "Something went wrong.",
  });
}

module.exports = { errorHandler };