import { describe, expect, it } from "vitest";
import {
  clientMatchReasonLabel,
  rankClientCandidates,
  type ClientCandidateInput,
} from "./matching";

const CANDIDATES: ClientCandidateInput[] = [
  {
    id: "name-only",
    name: "Ahmed",
    company: null,
    phone: null,
    email: null,
    matchReasons: ["NAME"],
  },
  {
    id: "email-only",
    name: "Sara",
    company: null,
    phone: null,
    email: "s@example.com",
    matchReasons: ["EMAIL"],
  },
  {
    id: "phone-only",
    name: "Yasmine",
    company: null,
    phone: "+212600000000",
    email: null,
    matchReasons: ["PHONE"],
  },
  {
    id: "both",
    name: "Karim",
    company: "Café K",
    phone: "+212611111111",
    email: "k@example.com",
    matchReasons: ["PHONE", "EMAIL"],
  },
];

describe("client candidate ranking", () => {
  it("ranks exact phone/email above name-only context", () => {
    expect(rankClientCandidates(CANDIDATES).map((candidate) => candidate.id)).toEqual([
      "both",
      "phone-only",
      "email-only",
      "name-only",
    ]);
  });

  it("keeps input order for equal scores", () => {
    const tied: ClientCandidateInput[] = [
      { id: "b", name: "B", company: null, phone: null, email: null, matchReasons: ["NAME"] },
      { id: "a", name: "A", company: null, phone: null, email: null, matchReasons: ["NAME"] },
    ];
    expect(rankClientCandidates(tied).map((candidate) => candidate.id)).toEqual(["b", "a"]);
  });

  it("labels match reasons for the operator dialog", () => {
    expect(clientMatchReasonLabel("PHONE")).toBe("Same phone");
    expect(clientMatchReasonLabel("EMAIL")).toBe("Same email");
    expect(clientMatchReasonLabel("NAME")).toBe("Similar name");
  });
});
