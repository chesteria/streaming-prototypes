import { describe, it, expect, vi, beforeEach } from "vitest";
import * as FocusEngine from "./focus-engine";

describe("FocusEngine (Literal Port)", () => {
  describe("createZone", () => {
    it("should initialize with startIndex", () => {
      const items = ["a", "b", "c"];
      const zone = FocusEngine.createZone(items, { startIndex: 1 });
      expect(zone.getIndex()).toBe(1);
    });

    it("should focus new items and notify callbacks", () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      const items = ["a", "b"];
      const zone = FocusEngine.createZone(items, { onFocus, onBlur });

      zone.focus(1);
      expect(onBlur).toHaveBeenCalledWith(0, "a");
      expect(onFocus).toHaveBeenCalledWith(1, "b");
      expect(zone.getIndex()).toBe(1);
    });

    it("should move focus correctly", () => {
      const items = ["a", "b", "c"];
      const zone = FocusEngine.createZone(items);

      expect(zone.move("RIGHT")).toBe(true);
      expect(zone.getIndex()).toBe(1);

      expect(zone.move("LEFT")).toBe(true);
      expect(zone.getIndex()).toBe(0);
    });

    it("should handle edge cases without wrapAround", () => {
      const items = ["a"];
      const zone = FocusEngine.createZone(items);

      expect(zone.move("LEFT")).toBe(false);
      expect(zone.move("RIGHT")).toBe(false);
    });

    it("should wrap around when configured", () => {
      const items = ["a", "b"];
      const zone = FocusEngine.createZone(items, { wrapAround: true });

      zone.move("LEFT");
      expect(zone.getIndex()).toBe(1);

      zone.move("RIGHT");
      expect(zone.getIndex()).toBe(0);
    });

    it("should update items in place with setItems", () => {
      const items = ["a", "b"];
      const zone = FocusEngine.createZone(items);

      zone.setItems(["c", "d", "e"]);
      expect(zone.getItems()).toEqual(["c", "d", "e"]);
      expect(items).toEqual(["c", "d", "e"]); // Original array mutated
    });
  });

  describe("Key Handling", () => {
    beforeEach(() => {
      FocusEngine.enable();
      FocusEngine.clearHandler();
    });

    it("should dispatch actions to handler", () => {
      const handler = vi.fn();
      FocusEngine.setHandler(handler);
      FocusEngine.init();

      const event = new KeyboardEvent("keydown", { key: "ArrowRight" });
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledWith("RIGHT", event);
    });

    it("should respect disabled state", () => {
      const handler = vi.fn();
      FocusEngine.setHandler(handler);
      FocusEngine.disable();

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" }),
      );
      expect(handler).not.toHaveBeenCalled();
    });

    it("should not register duplicate listeners on repeated init calls", () => {
      const handler = vi.fn();
      FocusEngine.enable();
      FocusEngine.setHandler(handler);

      FocusEngine.init();
      FocusEngine.init();

      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "ArrowRight" }),
      );
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
