import { Router } from "express";
import { postCommand } from "../controllers/command-controller.js";

const commandRouter = Router();

commandRouter.post("/", postCommand);

export default commandRouter;