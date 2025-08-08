import { createBlock } from "../../src/wiremap.ts";
import * as postService from "./postService.ts";

export default createBlock("@post", {
  ...createBlock("service", postService),
});
