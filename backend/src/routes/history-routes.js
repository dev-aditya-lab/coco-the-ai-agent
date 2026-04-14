import { Router } from "express";
import { getHistory } from "../controllers/commandController.js";

const historyRouter = Router();

historyRouter.get("/", getHistory);

export default historyRouter;