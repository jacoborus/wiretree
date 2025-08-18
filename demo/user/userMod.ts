import { tagBlock } from "../../src/wiremap.ts";
import * as userService from "./userService.ts";

export const $ = tagBlock("user");

export const service = userService;
