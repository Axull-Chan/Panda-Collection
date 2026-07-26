import { customerAuthFile, adminAuthFile } from "../fixtures/global-setup";

/** Pass to `test.use({ storageState })` at the top of a spec file. */
export const customerStorageState = customerAuthFile;
export const adminStorageState = adminAuthFile;
