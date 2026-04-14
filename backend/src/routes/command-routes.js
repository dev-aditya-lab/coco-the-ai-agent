import { Router } from "express";
import { postCommand } from "../controllers/commandController.js";

const commandRouter = Router();

commandRouter.post("/", postCommand);

export default commandRouter;