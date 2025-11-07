const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// AWS services will be initialized automatically when required

app.use("/auth", require("./routes/authRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/simulations", require("./routes/simulationRoutes"));
app.use("/clinical", require("./routes/feedbackRoutes"));
app.use("/reports", require("./routes/reportRoutes"));
app.use("/pharmacy", require("./routes/pharmacyRoutes"));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
