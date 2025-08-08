import { createBlock } from "../../src/wiremap.ts";
import * as userService from "./userService.ts";

export default createBlock("@user", {
  ...createBlock("service", userService),
});
