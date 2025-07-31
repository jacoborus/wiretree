import { block } from "../../src/wiretree.ts";
import * as postService from "./postService.ts";

export default block("@post", {
  ...block("service", postService),
});
