const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // Attempt to connect to MongoDB
    const conn = await mongoose.connect(process.env.MONGO_URI);

    // Log a success message if the connection is successful
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // Log the error and exit the process if the connection fails
    console.error(`Error connecting to MongoDB: ${error.message}`);
    // Exit process with a failure code
    process.exit(1);
  }
};

module.exports = connectDB;
