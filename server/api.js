import express from "express";
import dotenv from "dotenv";
import { ENUMERATOR, VOTER } from "./roles.js";
import { enrollPerson } from "./util.js";

dotenv.config();

const router = express.Router();

router.post("/enroll-enumerator", async (req, res) => {
  enrollPerson(req, res, ENUMERATOR);
});

router.post("/enroll-voter", async (req, res) => {
  enrollPerson(req, res, VOTER);
});

export default router;
