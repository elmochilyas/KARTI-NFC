import { describe, expect, it } from "vitest";
import { canTransitionInquiry, inquiryStatusLabel, isInquiryStatus } from "./inquiries";

describe("inquiry transitions", () => {
  it("allows NEW to move to any working state", () => {
    expect(canTransitionInquiry("NEW", "CONTACTED")).toBe(true);
    expect(canTransitionInquiry("NEW", "CLOSED")).toBe(true);
    expect(canTransitionInquiry("NEW", "SPAM")).toBe(true);
    expect(canTransitionInquiry("NEW", "NEW")).toBe(false);
  });

  it("allows CONTACTED to resolve or return to NEW", () => {
    expect(canTransitionInquiry("CONTACTED", "CLOSED")).toBe(true);
    expect(canTransitionInquiry("CONTACTED", "SPAM")).toBe(true);
    expect(canTransitionInquiry("CONTACTED", "NEW")).toBe(true);
  });

  it("only reopens terminal states", () => {
    expect(canTransitionInquiry("CLOSED", "NEW")).toBe(true);
    expect(canTransitionInquiry("CLOSED", "CONTACTED")).toBe(false);
    expect(canTransitionInquiry("SPAM", "NEW")).toBe(true);
    expect(canTransitionInquiry("SPAM", "CLOSED")).toBe(false);
  });

  it("guards and labels statuses", () => {
    expect(isInquiryStatus("NEW")).toBe(true);
    expect(isInquiryStatus("ARCHIVED")).toBe(false);
    expect(inquiryStatusLabel("CONTACTED")).toBe("Contacted");
  });
});
