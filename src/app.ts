import express from "express";
import bodyParser from "body-parser";
import sequelize from "./models";
import weatherRouter from "../src/routes/weather";

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use("/api", weatherRouter);

sequelize
  .sync()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });
