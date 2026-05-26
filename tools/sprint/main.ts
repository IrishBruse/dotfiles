import {
  currentSprintNumber,
  formatSprintBlock,
  sprintForNumber
} from "./sprint.ts";

const arg = process.argv[2];

if (arg !== undefined) {
  const number = Number(arg);
  if (!Number.isInteger(number) || number < 1) {
    console.error(`sprint: invalid sprint number: ${arg}`);
    process.exit(1);
  }
  console.log(formatSprintBlock(undefined, sprintForNumber(number)));
  process.exit(0);
}

const current = currentSprintNumber();

console.log(
  [
    formatSprintBlock("Previous", sprintForNumber(current - 1)),
    formatSprintBlock("Current", sprintForNumber(current)),
    formatSprintBlock("Next", sprintForNumber(current + 1))
  ].join("\n\n")
);
