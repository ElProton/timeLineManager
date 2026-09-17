import { describe, it, expect } from "vitest";
import {
  formatTime,
  formatTimePrecise,
  parseTime,
  isValidTimeFormat,
  sanitiseFilename,
} from "../utils/time";

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

  it("returns 0 for out-of-range seconds", () => {
    expect(parseTime("00:99")).toBe(0);
    expect(parseTime("03:60")).toBe(0);
  });

  it("returns 0 for trailing junk", () => {
    // parseInt alone would read "01:5abc" as 5.
    expect(parseTime("01:5abc")).toBe(0);
    expect(parseTime("01:30 ")).toBe(0);
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

  it("rejects seconds of 60 or more", () => {
    // The previous pattern accepted these and quietly reinterpreted them:
    // "00:99" parsed to 99 seconds and displayed back as "01:39".
    expect(isValidTimeFormat("00:99")).toBe(false);
    expect(isValidTimeFormat("03:60")).toBe(false);
    expect(isValidTimeFormat("12:75")).toBe(false);
  });

  it("still accepts 59 seconds", () => {
    expect(isValidTimeFormat("00:59")).toBe(true);
    expect(isValidTimeFormat("120:59")).toBe(true);
  });
});

describe("sanitiseFilename", () => {
  it("leaves a plain title alone apart from spaces", () => {
    expect(sanitiseFilename("Opening ceremony")).toBe("Opening_ceremony");
  });

  it("replaces characters no filesystem accepts", () => {
    expect(sanitiseFilename("Gala 1/2")).toBe("Gala_1-2");
    expect(sanitiseFilename('a:b*c?d"e<f>g|h')).toBe("a-b-c-d-e-f-g-h");
  });

  it("collapses runs of underscores and trims the edges", () => {
    expect(sanitiseFilename("  spaced   out  ")).toBe("spaced_out");
    expect(sanitiseFilename("__lead and trail__")).toBe("lead_and_trail");
  });

  it("strips control characters", () => {
    expect(sanitiseFilename("a\u0000b\u001fc")).toBe("abc");
  });

  it("falls back to a usable name when nothing survives", () => {
    expect(sanitiseFilename("")).toBe("timeline");
    expect(sanitiseFilename("///")).toBe("timeline");
  });

  it("caps the length", () => {
    expect(sanitiseFilename("x".repeat(500))).toHaveLength(100);
  });

  it("keeps accented characters", () => {
    expect(sanitiseFilename("Boléro final")).toBe("Boléro_final");
  });
});

describe("formatTimePrecise", () => {
  it("shows tenths, so a moving playhead reads as moving", () => {
    expect(formatTimePrecise(0)).toBe("00:00.0");
    expect(formatTimePrecise(12.4)).toBe("00:12.4");
    expect(formatTimePrecise(75.06)).toBe("01:15.0");
  });

  it("truncates rather than rounding, like formatTime", () => {
    // Rounding would make it read 01:00.0 while the second is still 59.
    expect(formatTimePrecise(59.99)).toBe("00:59.9");
  });

  it("never shows a negative position", () => {
    expect(formatTimePrecise(-5)).toBe("00:00.0");
  });

  it("agrees with formatTime on whole seconds", () => {
    for (const seconds of [0, 7, 60, 599, 3600]) {
      expect(formatTimePrecise(seconds)).toBe(`${formatTime(seconds)}.0`);
    }
  });
});
