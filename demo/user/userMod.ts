import { createBlock } from "../../src/wiretree.ts";
import * as userService from "./userService.ts";

export default createBlock("@user", {
  ...createBlock("service", userService),
});
