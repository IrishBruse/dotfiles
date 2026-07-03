import process from "node:process";

const ESC = "\x1b";
const RESET = `${ESC}[0m`;

function toLiteral(code: string): string {
  return code.replaceAll(ESC, "\\x1b");
}

function row(label: string, code: string, sample: string): string {
  const styled = `${code}${sample}${RESET}`;
  return `  ${label.padEnd(16)} ${toLiteral(code).padEnd(22)} ${styled}`;
}

function codeRow(label: string, code: string, note: string): string {
  return `  ${label.padEnd(16)} ${toLiteral(code).padEnd(22)} ${note}`;
}

function section(title: string, lines: string[]): string {
  return `${title}\n${lines.join("\n")}`;
}

const SAMPLE = "The quick brown fox jumps over the lazy dog";

const styles = section("Styles (SGR)", [
  row("reset", RESET, SAMPLE),
  row("bold", `${ESC}[1m`, SAMPLE),
  row("dim", `${ESC}[2m`, SAMPLE),
  row("italic", `${ESC}[3m`, SAMPLE),
  row("underline", `${ESC}[4m`, SAMPLE),
  row("blink", `${ESC}[5m`, SAMPLE),
  row("inverse", `${ESC}[7m`, SAMPLE),
  row("hidden", `${ESC}[8m`, "(hidden text)"),
  row("strikethrough", `${ESC}[9m`, SAMPLE)
]);

const fgNames = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white"
] as const;

function colorRows(label: string, base: number, sample: string): string {
  const lines = fgNames.map((name, index) =>
    row(name, `${ESC}[${base + index}m`, sample)
  );
  return section(label, lines);
}

const standardFg = colorRows("Foreground (8)", 30, SAMPLE);
const standardBg = colorRows("Background (8)", 40, " background ");
const brightFg = colorRows("Bright foreground", 90, SAMPLE);
const brightBg = colorRows("Bright background", 100, " background ");

const combos = section("Style + color", [
  row("bold red", `${ESC}[1;31m`, SAMPLE),
  row("dim cyan", `${ESC}[2;36m`, SAMPLE),
  row("underline green", `${ESC}[4;32m`, SAMPLE),
  row("bold on blue", `${ESC}[1;34;44m`, " white on blue "),
  row("inverse yellow", `${ESC}[7;33m`, SAMPLE)
]);

function block(code: string): string {
  return `${code}  ████${RESET}`;
}

const palette256 = section(
  "256-color foreground (38;5;n)",
  Array.from({ length: 256 }, (_, index) => {
    const code = `${ESC}[38;5;${index}m`;
    const label = String(index).padStart(3);
    return `  ${label}  ${toLiteral(code).padEnd(22)} ${block(code)}`;
  })
);

const trueColor = section("24-bit true color (38;2;r;g;b)", [
  row("orange", `${ESC}[38;2;255;128;0m`, SAMPLE),
  row("violet", `${ESC}[38;2;138;43;226m`, SAMPLE),
  row("teal", `${ESC}[38;2;0;128;128m`, SAMPLE),
  row("bg lavender", `${ESC}[48;2;230;230;250m`, " lavender background ")
]);

const gradient = section(
  "24-bit gradient (38;2;r;g;b)",
  Array.from({ length: 24 }, (_, index) => {
    const red = Math.round((index / 23) * 255);
    const green = Math.round(((23 - index) / 23) * 180);
    const blue = Math.round((index / 23) * 255);
    const code = `${ESC}[38;2;${red};${green};${blue}m`;
    return `  ${String(index).padStart(2)}  ${toLiteral(code).padEnd(30)} ${code}########${RESET}`;
  })
);

const controls = section("Cursor and screen (CSI)", [
  codeRow("cursor home", `${ESC}[H`, "(moves cursor to top-left)"),
  codeRow("erase display", `${ESC}[2J`, "(clears entire screen)"),
  codeRow("erase line", `${ESC}[2K`, "(clears current line)"),
  codeRow("cursor up", `${ESC}[1A`, "(moves cursor up one row)"),
  codeRow("cursor down", `${ESC}[1B`, "(moves cursor down one row)"),
  codeRow("cursor forward", `${ESC}[1C`, "(moves cursor right one column)"),
  codeRow("cursor back", `${ESC}[1D`, "(moves cursor left one column)"),
  codeRow("save cursor", `${ESC}[s`, "(saves cursor position)"),
  codeRow("restore cursor", `${ESC}[u`, "(restores cursor position)"),
  codeRow("hide cursor", `${ESC}[?25l`, "(hides cursor)"),
  codeRow("show cursor", `${ESC}[?25h`, "(shows cursor)")
]);

function printHelp(): void {
  console.error(`ansii - terminal ANSI color and style reference

Usage:
  ansii
  ansii 256
  ansii 24-bit
  ansii gradient
  ansii -h
  ansii --help

Commands:
  (none)     Common styles, 8/16 colors, CSI controls
  256        Full 256-color foreground palette (38;5;n)
  24-bit     24-bit true-color samples (38;2;r;g;b and 48;2;r;g;b)
  gradient   24-bit true-color gradient samples (38;2;r;g;b)

Options:
  -h, --help   This help
`);
}

function printDefault(): void {
  const sections = [
    styles,
    standardFg,
    standardBg,
    brightFg,
    brightBg,
    combos,
    controls
  ];

  console.log(sections.join("\n\n"));
}

function print256(): void {
  console.log(palette256);
}

function print24Bit(): void {
  console.log(trueColor);
}

function printGradient(): void {
  console.log(gradient);
}

export function main(argv: string[]): void {
  if (argv.includes("-h") || argv.includes("--help")) {
    printHelp();
    return;
  }

  const [command, ...rest] = argv;

  if (command === undefined) {
    printDefault();
    return;
  }

  if (command === "256") {
    if (rest.length > 0) {
      console.error(`ansii 256: unexpected argument(s): ${rest.join(" ")}`);
      printHelp();
      process.exit(1);
    }
    print256();
    return;
  }

  if (command === "24-bit") {
    if (rest.length > 0) {
      console.error(`ansii 24-bit: unexpected argument(s): ${rest.join(" ")}`);
      printHelp();
      process.exit(1);
    }
    print24Bit();
    return;
  }

  if (command === "gradient") {
    if (rest.length > 0) {
      console.error(
        `ansii gradient: unexpected argument(s): ${rest.join(" ")}`
      );
      printHelp();
      process.exit(1);
    }
    printGradient();
    return;
  }

  console.error(`ansii: unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main(process.argv.slice(2));
