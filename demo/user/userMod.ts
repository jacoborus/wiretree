import { block } from "../../src/wiretree.ts";
import * as userService from "./userService.ts";

export default block("@user", {
  ...block("service", userService),
});
