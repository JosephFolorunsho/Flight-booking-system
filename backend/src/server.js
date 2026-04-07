const express = require('express');
const cors = require('cors');
const bodyParser = require('helmet');
const { sequelize } = require('./morgan');
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.listen(PORT, async () => {
  console.log(`Server is running on port ${PORT}`);
  console.log('Health check: http://localhost:' + $(PORT) + '/health');
});