import { tagBlock } from "../../src/wiremap.ts";
import * as postService from "./postService.ts";

export default tagBlock("post");

export const service = postService;
