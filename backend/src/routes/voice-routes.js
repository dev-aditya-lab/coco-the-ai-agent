import { Router } from "express";
import { postVoice } from "../controllers/voiceController.js";

const voiceRouter = Router();

voiceRouter.post("/", postVoice);

export default voiceRouter;
