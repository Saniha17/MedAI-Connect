require("dotenv").config({ path: __dirname + "/.env" });

const app = require("./app");
const sequelize = require("./config/db");
require("./models/userModel");
require("./models/hospitalModel");
require("./models/emergencyModel");

const PORT = process.env.PORT || 5000;

sequelize.sync()
    .then(() => {
        console.log("✅ Database Connected Successfully");

        app.listen(PORT, () => {
            console.log(`🚀 Server is running on port ${PORT}`);
        });
    })
    .catch((err) => {
        console.error("❌ Database Connection Failed");
        console.error(err);
    });