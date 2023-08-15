import express from "express";
import cors from "cors";
import { PORT } from "./consts.js";
import router from "./api.js";

const app = express();

app.use(
  cors({
    origin: "*", // TODO: change this to the frontend url
  })
);
app.use(express.text());
app.use(express.json());
app.use("/api", router);

app.listen(PORT, () => console.log("Server on port", PORT));
