import { tagBlock } from "../../src/wiremap.ts";
import * as postService from "./postService.ts";

export const $ = tagBlock("post");

export const service = postService;
