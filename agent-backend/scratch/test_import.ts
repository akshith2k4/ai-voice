import { mock } from "bun:test";

const mockConnectionSend = mock((sessionId: string, msg: any) => {
  return true;
});

mock.module("../src/connectionManager.js", () => ({
  connectionManager: {
    send: mockConnectionSend,
    add: mock(() => {}),
    remove: mock(() => {}),
    get: mock(() => undefined),
    has: mock(() => true),
    broadcast: mock(() => 0),
    touch: mock(() => {}),
    getSessionIds: mock(() => []),
    size: 0,
  },
}));

mock.module("../src/services/ttsService.js", () => ({
  synthesize: mock(async () => ""),
  synthesizeStream: mock(async () => {}),
}));

mock.module("../src/services/s3Service.js", () => ({
  checkS3ObjectExists: mock(async () => false),
  getPresignedUrl: mock(async () => ""),
  uploadToS3: mock(async () => {}),
}));

mock.module("../src/schema/loader.js", () => ({
  getSchema: () => ({}),
  getAvailableForms: () => [],
}));

const driverModule = await import("../src/walkthrough/driver.js");
console.log("Keys of driver module:", Object.keys(driverModule));
console.log("walkthroughDriver:", driverModule.walkthroughDriver);
console.log("handleStatus type:", typeof driverModule.walkthroughDriver?.handleStatus);
