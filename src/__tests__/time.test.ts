import { describe, it, expect } from "vitest";
import { formatTime, parseTime, isValidTimeFormat } from "../utils/time";

describe("formatTime", () => {
  it("formats 0 seconds as 00:00", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("formats seconds only", () => {
    expect(formatTime(5)).toBe("00:05");
    expect(formatTime(45)).toBe("00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatTime(65)).toBe("01:05");
    expect(formatTime(130)).toBe("02:10");
  });

  it("formats exact minutes", () => {
    expect(formatTime(60)).toBe("01:00");
    expect(formatTime(300)).toBe("05:00");
  });

  it("handles large values", () => {
    expect(formatTime(3600)).toBe("60:00");
    expect(formatTime(5999)).toBe("99:59");
  });

  it("floors fractional seconds", () => {
    expect(formatTime(61.7)).toBe("01:01");
    expect(formatTime(0.9)).toBe("00:00");
  });
});

describe("parseTime", () => {
  it("parses 00:00 to 0", () => {
    expect(parseTime("00:00")).toBe(0);
  });

  it("parses minutes and seconds", () => {
    expect(parseTime("01:30")).toBe(90);
    expect(parseTime("05:00")).toBe(300);
  });

  it("parses seconds only", () => {
    expect(parseTime("00:45")).toBe(45);
  });

  it("returns 0 for invalid format (no colon)", () => {
    expect(parseTime("130")).toBe(0);
  });

  it("returns 0 for non-numeric parts", () => {
    expect(parseTime("ab:cd")).toBe(0);
  });

  it("returns 0 for empty string", () => {
    expect(parseTime("")).toBe(0);
  });

  it("handles extra colons", () => {
    expect(parseTime("01:30:00")).toBe(0);
  });

  it("is inverse of formatTime", () => {
    expect(parseTime(formatTime(90))).toBe(90);
    expect(parseTime(formatTime(0))).toBe(0);
    expect(parseTime(formatTime(3600))).toBe(3600);
  });
});

describe("isValidTimeFormat", () => {
  it("accepts MM:SS format", () => {
    expect(isValidTimeFormat("00:00")).toBe(true);
    expect(isValidTimeFormat("01:30")).toBe(true);
    expect(isValidTimeFormat("99:59")).toBe(true);
  });

  it("accepts more than 2 digits for minutes", () => {
    expect(isValidTimeFormat("100:00")).toBe(true);
  });

  it("rejects single digit seconds", () => {
    expect(isValidTimeFormat("01:5")).toBe(false);
  });

  it("rejects missing colon", () => {
    expect(isValidTimeFormat("0130")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidTimeFormat("")).toBe(false);
  });

  it("rejects letters", () => {
    expect(isValidTimeFormat("ab:cd")).toBe(false);
  });

  it("rejects extra colons", () => {
    expect(isValidTimeFormat("01:30:00")).toBe(false);
  });
});
