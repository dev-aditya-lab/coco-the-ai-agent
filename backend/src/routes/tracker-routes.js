import { Router } from "express";
import { getTrackerSummary } from "../controllers/trackerController.js";

const trackerRouter = Router();

trackerRouter.get("/summary", getTrackerSummary);

export default trackerRouter;
