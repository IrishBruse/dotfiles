import {
  currentSprintNumber,
  formatSprintBlock,
  sprintForNumber
} from "./sprint.ts";

const current = currentSprintNumber();

const blocks = [
  formatSprintBlock("Previous", sprintForNumber(current - 1)),
  formatSprintBlock("Current", sprintForNumber(current)),
  formatSprintBlock("Next", sprintForNumber(current + 1))
];

console.log(blocks.join("\n\n"));
