import { createBlock } from "../../src/wiretree.ts";
import * as postService from "./postService.ts";

export default createBlock("@post", {
  ...createBlock("service", postService),
});
