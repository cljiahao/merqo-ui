import { describe, expect, it } from "vitest";
import { DashboardTour } from "./dashboard-tour";
import { ImageUploader } from "./image-uploader";
import {
  commitPendingImages,
  isPendingImage,
  PendingImageUploadError,
} from "./pending-image";

// Importing the package root transforms every module it re-exports, which
// can take well over the default 30s when the whole suite runs in parallel on
// a loaded machine. One import here, with room to spare, instead of one per
// component test file racing that limit.
const ROOT_IMPORT_TIMEOUT_MS = 120_000;

describe("package root", () => {
  it(
    "re-exports each module's own binding",
    async () => {
      const root = await import("./index");
      expect(root.DashboardTour).toBe(DashboardTour);
      expect(root.ImageUploader).toBe(ImageUploader);
      expect(root.commitPendingImages).toBe(commitPendingImages);
      expect(root.isPendingImage).toBe(isPendingImage);
      expect(root.PendingImageUploadError).toBe(PendingImageUploadError);
    },
    ROOT_IMPORT_TIMEOUT_MS,
  );
});
